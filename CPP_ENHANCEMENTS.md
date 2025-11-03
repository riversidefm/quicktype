# C++ Generator Enhancements

This document describes the new features added to quicktype's C++ generator to provide more control over code generation without requiring custom renderers or regex post-processing.

## New Command-Line Options

### 1. Type Overrides (`--type-overrides`)

Allows you to substitute JSON schema types with custom C++ types via a configuration file.

**Usage:**

```bash
quicktype --lang cpp --type-overrides overrides.json schema.json
```

**Override File Format:**
The file should be a JSON array of override rules:

```json
[
  {
    "pattern": "Time$",
    "substitution": "std::chrono::time_point<std::chrono::system_clock>",
    "header": "chrono"
  },
  {
    "pattern": "Duration$",
    "substitution": "std::chrono::duration<int64_t>",
    "header": "chrono"
  },
  {
    "pattern": "UUID$",
    "substitution": "boost::uuids::uuid",
    "header": "boost/uuid/uuid.hpp"
  }
]
```

**Fields:**

- `pattern`: Regex pattern to match against type names
- `substitution`: C++ type to use instead
- `header`: Header file to include
  - Headers without `/` or `\` are treated as system headers (angle brackets)
  - Headers with paths or starting with `boost/` use angle brackets
  - Other headers use quotes

**Behavior:**

- Types matching patterns are substituted throughout generated code
- No separate files are generated for substituted types
- Headers are automatically included where the types are used

### 2. Custom JSON Type (`--json-type`)

Override the default `nlohmann::json` type with a custom JSON library type.

**Usage:**

```bash
quicktype --lang cpp --json-type "JsonValueType" schema.json
```

This replaces all instances of `nlohmann::json` (used for `any` types) with your custom type.

## Enhanced Features

### 3. Smart STL Header Inclusion

The generator now intelligently includes STL headers only when they're actually used:

- `<vector>` - included only when arrays are used
- `<map>` - included only when objects with additionalProperties are used
- `<string>` - included only when string types are used
- `<optional>` - included only when optional properties exist

This reduces compilation overhead and makes generated headers cleaner.

### 4. Clean `--just-types` Output

When using `--just-types`, the generator now:

- **Does NOT** include `nlohmann/json.hpp`
- **Does NOT** emit `using nlohmann::json;` directives
- Only includes necessary STL headers for the actual types used

This makes the generated types truly standalone and suitable for use without JSON serialization dependencies.

### 5. Multi-Source Mode Enhancements

In `--source-style multi-source` mode:

- Automatically includes headers of referenced generated types
- Skips file generation for types that are substituted via type overrides
- Smart handling of forward declarations vs includes

## Real-World Example: Timeline Schema

**Schema**: Video editing timeline with rational time values

**Type Overrides** (`type-overrides.json`):

```json
[
  {
    "pattern": "PositiveFraction$",
    "substitution": "rstl::PositiveFraction",
    "header": "rstl/positive_fraction.h"
  },
  {
    "pattern": "Duration$",
    "substitution": "rstl::Duration",
    "header": "rstl/duration.h"
  },
  {
    "pattern": "Time$",
    "substitution": "rstl::Time",
    "header": "rstl/time.h"
  },
  {
    "pattern": "TimeRange$",
    "substitution": "rstl::TimeRange",
    "header": "rstl/time_range.h"
  }
]
```

**Command:**

```bash
quicktype \
  --lang cpp \
  --src-lang schema \
  --src schema/timeline.schema \
  --just-types \
  --source-style multi-source \
  --code-format with-struct \
  --type-overrides type-overrides.json \
  --json-type JsonValueType \
  --namespace quicktype \
  --top-level Timeline \
  --no-boost
```

**Generated Output** (Timeline.hpp excerpt):

```cpp
#pragma once

#include <optional>
#include <vector>
#include <map>
#include <string>

#include "rstl/positive_fraction.h"
#include "rstl/duration.h"
#include "rstl/time_range.h"

#include "AssetSchema.hpp"
#include "Clip.hpp"
#include "Cuts.hpp"
// ... other generated type includes

namespace quicktype {
    struct Timeline {
        std::vector<AssetSchema> assets;
        std::vector<Clip> clips;
        Cuts cuts;
        rstl::PositiveFraction duration;  // <-- Custom type substituted!
        std::string id;
        std::optional<std::string> name;
        std::vector<SceneSchema> scenes;
        TimelineSettings settings;
        std::vector<TrackSchema> tracks;
        std::string version;
    };
}
```

**Results:**

- ✅ No `Duration`, `Time`, `PositiveFraction`, or `TimeRange` files generated
- ✅ Custom types (`rstl::*`) used throughout
- ✅ `JsonValueType` used instead of `nlohmann::json`
- ✅ Only necessary STL headers included
- ✅ No nlohmann/json dependencies
- ✅ Truly standalone types

## Benefits

1. **No Regex Post-Processing**: Type substitution happens during generation, not via fragile regex replacements
2. **Smart Includes**: Only necessary headers are included
3. **Clean Standalone Types**: `--just-types` generates truly dependency-free types
4. **Better Integration**: Works seamlessly with custom type libraries
5. **Multi-Source Friendly**: Proper header management in multi-file output mode
6. **Type Safe**: No risk of regex matching errors

## Migration from Custom Generators

If you were using a custom generator with regex-based type substitution, you can now use the built-in quicktype with the `--type-overrides` option instead. This provides:

- Better type safety (no regex mistakes)
- Proper header management
- Integration with all quicktype features
- Easier maintenance

Simply convert your substitution rules to the JSON format and use the `--type-overrides` option.

## Implementation Details

**Files Modified:**

- `packages/quicktype-core/src/language/CPlusPlus/language.ts` - Added new command-line options
- `packages/quicktype-core/src/language/CPlusPlus/utils.ts` - Added type override infrastructure
- `packages/quicktype-core/src/language/CPlusPlus/CPlusPlusRenderer.ts` - Integrated all features

**Key Changes:**

- Type substitution checked during type generation
- STL header usage tracked during traversal
- Custom JSON type support in type matching
- Skip file generation for substituted types
- Smart system vs. local header detection
