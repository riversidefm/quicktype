import { mapMap, mapFromObject } from "collection-utils";

import type {
    JSONSchemaAttributes,
    JSONSchemaType,
    Ref,
} from "../input/JSONSchemaInput";
import type { JSONSchema } from "../input/JSONSchemaStore";
import type { EnumType } from "../Type/Type";

import {
    type AccessorNames,
    type AccessorEntry,
    lookupKey,
} from "./AccessorNames";
import { TypeAttributeKind } from "./TypeAttributes";
import { checkStringMap, isStringMap } from "../support/Support";

class EnumValuesTypeAttributeKind extends TypeAttributeKind<AccessorNames> {
    public constructor() {
        super("enumValues");
    }

    public makeInferred(_: AccessorNames): undefined {
        return undefined;
    }
}

export const enumValuesTypeAttributeKind: TypeAttributeKind<AccessorNames> =
    new EnumValuesTypeAttributeKind();

export function enumCaseValues(
    e: EnumType,
    language: string,
): Map<string, [string, boolean] | undefined> {
    const enumValues = enumValuesTypeAttributeKind.tryGetInAttributes(
        e.getAttributes(),
    );
    if (enumValues === undefined)
        return mapMap(e.cases.entries(), (_) => undefined);
    return mapMap(e.cases.entries(), (c) => lookupKey(enumValues, c, language));
}

// Enum values can be strings or numbers, unlike accessor names which are strings only
function isEnumValueEntry(
    x: unknown,
): x is string | number | { [language: string]: string | number } {
    if (typeof x === "string" || typeof x === "number") {
        return true;
    }

    return isStringMap(x, (v: unknown): v is string | number =>
        typeof v === "string" || typeof v === "number"
    );
}

function makeEnumValueEntry(
    ae: string | number | { [language: string]: string | number },
): AccessorEntry {
    // Convert numbers to strings for storage
    if (typeof ae === "string") return ae;
    if (typeof ae === "number") return ae.toString();
    return mapMap(mapFromObject(ae), (v) => v.toString());
}

function makeEnumValueAccessorNames(x: unknown): AccessorNames {
    const stringMap = checkStringMap(x, isEnumValueEntry);
    return mapMap(mapFromObject(stringMap), makeEnumValueEntry);
}

export function enumValuesAttributeProducer(
    schema: JSONSchema,
    _canonicalRef: Ref | undefined,
    _types: Set<JSONSchemaType>,
): JSONSchemaAttributes | undefined {
    if (typeof schema !== "object") return undefined;

    const maybeEnumValues = schema["qt-enum-values"];

    if (maybeEnumValues === undefined) return undefined;

    return {
        forType: enumValuesTypeAttributeKind.makeAttributes(
            makeEnumValueAccessorNames(maybeEnumValues),
        ),
    };
}
