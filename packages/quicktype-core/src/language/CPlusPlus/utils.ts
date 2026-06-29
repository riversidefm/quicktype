import {
    type MinMaxConstraint,
    minMaxLengthForType,
    minMaxValueForType,
    patternForType,
} from "../../attributes/Constraints";
import type { Name } from "../../Naming";
import type { Sourcelike } from "../../Source";
import {
    isAscii,
    isLetterOrUnderscoreOrDigit,
    legalizeCharacters,
} from "../../support/Strings";
import type { Type, TypeKind } from "../../Type";

export function constraintsForType(t: Type):
    | {
          minMax?: MinMaxConstraint;
          minMaxLength?: MinMaxConstraint;
          pattern?: string;
      }
    | undefined {
    const minMax = minMaxValueForType(t);
    const minMaxLength = minMaxLengthForType(t);
    const pattern = patternForType(t);
    if (
        minMax === undefined &&
        minMaxLength === undefined &&
        pattern === undefined
    )
        return undefined;
    return { minMax, minMaxLength, pattern };
}

export const legalizeName = legalizeCharacters(
    (cp) => isAscii(cp) && isLetterOrUnderscoreOrDigit(cp),
);

/// Type to use as an optional if cycle breaking is required
export const optionalAsSharedType = "std::shared_ptr";
/// Factory to use when creating an optional if cycle breaking is required
export const optionalFactoryAsSharedType = "std::make_shared";

/**
 * To be able to support circles in multiple files -
 * e.g. class#A using class#B using class#A (obviously not directly,
 * but in vector or in variant) we can forward declare them;
 */
export enum IncludeKind {
    ForwardDeclare = "ForwardDeclare",
    Include = "Include",
}

// FIXME: make these string enums eventually
export enum GlobalNames {
    ClassMemberConstraints = 1,
    ClassMemberConstraintException = 2,
    ValueTooLowException = 3,
    ValueTooHighException = 4,
    ValueTooShortException = 5,
    ValueTooLongException = 6,
    InvalidPatternException = 7,
    CheckConstraint = 8,
}

// FIXME: make these string enums eventually
export enum MemberNames {
    MinIntValue = 1,
    GetMinIntValue = 2,
    SetMinIntValue = 3,
    MaxIntValue = 4,
    GetMaxIntValue = 5,
    SetMaxIntValue = 6,
    MinDoubleValue = 7,
    GetMinDoubleValue = 8,
    SetMinDoubleValue = 9,
    MaxDoubleValue = 10,
    GetMaxDoubleValue = 11,
    SetMaxDoubleValue = 12,
    MinLength = 13,
    GetMinLength = 14,
    SetMinLength = 15,
    MaxLength = 16,
    GetMaxLength = 17,
    SetMaxLength = 18,
    Pattern = 19,
    GetPattern = 20,
    SetPattern = 21,
}

export interface ConstraintMember {
    cppConstType?: string;
    cppType: string;
    getter: MemberNames;
    name: MemberNames;
    setter: MemberNames;
}

export interface IncludeRecord {
    kind: IncludeKind | undefined /** How to include that */;
    typeKind: TypeKind | undefined /** What exactly to include */;
}

export interface TypeRecord {
    forceInclude: boolean;
    level: number;
    name: Name;
    type: Type;
    variant: boolean;
}

/**
 * We map each and every unique type to a include kind, e.g. how
 * to include the given type
 */
export type IncludeMap = Map<string, IncludeRecord>;

export interface TypeContext {
    inJsonNamespace: boolean;
    needsForwardIndirection: boolean;
    needsOptionalIndirection: boolean;
}

export interface StringType {
    createStringLiteral: (inner: Sourcelike) => Sourcelike;
    emitHelperFunctions: () => void;
    getConstType: () => string;
    getRegex: () => string;
    getSMatch: () => string;
    getType: () => string;
    wrapEncodingChange: (
        qualifier: Sourcelike[],
        fromType: Sourcelike,
        toType: Sourcelike,
        inner: Sourcelike,
    ) => Sourcelike;
    wrapToString: (inner: Sourcelike) => Sourcelike;
}

export function addQualifier(
    qualifier: Sourcelike,
    qualified: Sourcelike[],
): Sourcelike[] {
    if (qualified.length === 0) {
        return [];
    }

    return [qualifier, qualified];
}

export class WrappingCode {
    public constructor(
        private readonly start: Sourcelike[],
        private readonly end: Sourcelike[],
    ) {}

    public wrap(qualifier: Sourcelike, inner: Sourcelike): Sourcelike {
        return [addQualifier(qualifier, this.start), inner, this.end];
    }
}

export class BaseString {
    public _stringType: string;

    public _constStringType: string;

    public _smatch: string;

    public _regex: string;

    public _stringLiteralPrefix: string;

    public _toString: WrappingCode;

    public _encodingClass: Sourcelike;

    public _encodingFunction: Sourcelike;

    public constructor(
        stringType: string,
        constStringType: string,
        smatch: string,
        regex: string,
        stringLiteralPrefix: string,
        toString: WrappingCode,
        encodingClass: string,
        encodingFunction: string,
    ) {
        this._stringType = stringType;
        this._constStringType = constStringType;
        this._smatch = smatch;
        this._regex = regex;
        this._stringLiteralPrefix = stringLiteralPrefix;
        this._toString = toString;
        this._encodingClass = encodingClass;
        this._encodingFunction = encodingFunction;
    }

    public getType(): string {
        return this._stringType;
    }

    public getConstType(): string {
        return this._constStringType;
    }

    public getSMatch(): string {
        return this._smatch;
    }

    public getRegex(): string {
        return this._regex;
    }

    public createStringLiteral(inner: Sourcelike): Sourcelike {
        return [this._stringLiteralPrefix, '"', inner, '"'];
    }

    public wrapToString(inner: Sourcelike): Sourcelike {
        return this._toString.wrap([], inner);
    }
}

/**
 * Type override rule for substituting JSON schema types with custom C++ types
 * or enhancing generated types with base classes and methods
 */
export interface TypeOverrideRule {
    /** Regex pattern to match against type names */
    pattern: string;

    /** C++ type to substitute (mutually exclusive with base class inheritance) */
    substitution?: string;

    /** Base classes to inherit from with public access */
    publicBaseClasses?: string[];
    /** Base classes to inherit from with protected access */
    protectedBaseClasses?: string[];
    /** Base classes to inherit from with private access */
    privateBaseClasses?: string[];

    /** Header files to include (for substitutions, base classes, injected methods, etc.) */
    additionalHeaders?: string[];

    /** Public method declarations to inject */
    injectPublic?: string[];
    /** Protected method declarations to inject */
    injectProtected?: string[];
    /** Private method declarations to inject */
    injectPrivate?: string[];

    /** Field names to make private */
    privateFields?: string[];
    /** Field names to make protected */
    protectedFields?: string[];

    /** Full type to use for array elements (e.g., "Asset *" to generate std::vector<Asset *>) */
    arrayType?: string;
    /** Container type for arrays of this type (e.g., "std::list" to generate std::list<T> instead of std::vector<T>) */
    arrayContainer?: string;

    /** If true, suppress file generation for this type (useful for synthetic types like DurationClass) */
    skipGeneration?: boolean;
}

/**
 * Loads and parses type override rules from a JSON file
 */
export function loadTypeOverrides(filePath: string): TypeOverrideRule[] {
    if (!filePath) {
        return [];
    }

    try {
        const fs = require("fs");
        const content = fs.readFileSync(filePath, "utf-8");
        const rules = JSON.parse(content) as TypeOverrideRule[];

        // Validate the structure
        if (!Array.isArray(rules)) {
            throw new Error("Type overrides file must contain an array of rules");
        }

        for (const rule of rules) {
            // Pattern is required
            if (!rule.pattern) {
                throw new Error("Each type override rule must have a pattern field");
            }

            // Check for mutually exclusive options
            const hasBaseClass = rule.publicBaseClasses || rule.protectedBaseClasses || rule.privateBaseClasses;
            if (rule.substitution && hasBaseClass) {
                throw new Error(
                    `Rule with pattern "${rule.pattern}" cannot have both substitution and base class inheritance - they are mutually exclusive`
                );
            }

            // Must have either substitution, base class, field access modifiers, array type, array container, or skipGeneration
            if (!rule.substitution && !hasBaseClass && !rule.privateFields && !rule.protectedFields && !rule.arrayType && !rule.arrayContainer && !rule.skipGeneration) {
                throw new Error(
                    `Rule with pattern "${rule.pattern}" must have either substitution, base class inheritance, field access modifiers (privateFields/protectedFields), arrayType, arrayContainer, or skipGeneration`
                );
            }

            // If substitution, base classes, array type, or array container, additionalHeaders should be provided
            if ((rule.substitution || hasBaseClass || rule.arrayType || rule.arrayContainer) && (!rule.additionalHeaders || rule.additionalHeaders.length === 0)) {
                console.warn(
                    `Rule with pattern "${rule.pattern}" has substitution, base classes, arrayType, or arrayContainer but no additionalHeaders specified`
                );
            }

            // Warn if base class inheritance but no methods to inject
            if (hasBaseClass && !rule.injectPublic && !rule.injectProtected && !rule.injectPrivate) {
                console.warn(
                    `Rule with pattern "${rule.pattern}" has base class inheritance but no methods to inject - type will only inherit from base`
                );
            }
        }

        return rules;
    } catch (error) {
        throw new Error(`Failed to load type overrides from ${filePath}: ${error}`);
    }
}

/**
 * Finds a matching type override rule for a given type name
 */
export function findTypeOverride(typeName: string, rules: TypeOverrideRule[]): TypeOverrideRule | undefined {
    for (const rule of rules) {
        const regex = new RegExp(rule.pattern);
        if (regex.test(typeName)) {
            return rule;
        }
    }
    return undefined;
}
