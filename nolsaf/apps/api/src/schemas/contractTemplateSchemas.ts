import { z } from "zod";

const fieldDataTypeSchema = z.enum(["string", "integer", "date", "datetime", "boolean"]);

const fieldValidationSchema = z
  .object({
    regex: z.string().optional(),
    unique: z.boolean().optional(),
    format: z.string().optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    enum: z.array(z.string()).min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (typeof data.minLength === "number" && typeof data.maxLength === "number" && data.minLength > data.maxLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minLength cannot be greater than maxLength",
        path: ["minLength"],
      });
    }
    if (typeof data.min === "number" && typeof data.max === "number" && data.min > data.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "min cannot be greater than max",
        path: ["min"],
      });
    }
  });

export const contractTemplateFieldSchema = z
  .object({
    placeholder: z.string().regex(/^[A-Z0-9_]+$/),
    required: z.boolean(),
    dataType: fieldDataTypeSchema,
    source: z.string().min(1),
    fallbackSource: z.string().min(1).optional(),
    example: z.string().optional(),
    default: z.union([z.string(), z.number(), z.boolean()]).optional(),
    computedRule: z.string().optional(),
    editable: z.boolean(),
    validation: fieldValidationSchema.optional(),
  })
  .strict()
  .superRefine((field, ctx) => {
    if (field.dataType === "integer" && typeof field.default !== "undefined" && typeof field.default !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "default must be a number when dataType is integer",
        path: ["default"],
      });
    }

    if (field.dataType === "boolean" && typeof field.default !== "undefined" && typeof field.default !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "default must be a boolean when dataType is boolean",
        path: ["default"],
      });
    }

    if ((field.dataType === "date" || field.dataType === "datetime") && typeof field.default !== "undefined" && typeof field.default !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "default must be a string when dataType is date or datetime",
        path: ["default"],
      });
    }

    if (field.dataType === "string" && typeof field.default !== "undefined" && typeof field.default !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "default must be a string when dataType is string",
        path: ["default"],
      });
    }
  });

const templateMetaSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    templateFile: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

const generationRulesSchema = z
  .object({
    lockFieldsAtSigning: z.boolean(),
    allowManualOverrideBeforeSend: z.array(z.string().regex(/^[A-Z0-9_]+$/)).default([]),
    effectiveDateStrategy: z.string().min(1),
    voidAndReissueOnLegalIdentityChange: z.boolean(),
  })
  .strict();

const preSendValidationSchema = z
  .object({
    requiredFieldsMustBeResolved: z.boolean(),
    blockOnMissingLegalIdentity: z.array(z.string().regex(/^[A-Z0-9_]+$/)).default([]),
    blockOnMissingCommercialTerms: z.array(z.string().regex(/^[A-Z0-9_]+$/)).default([]),
    blockOnMissingNoticeData: z.array(z.string().regex(/^[A-Z0-9_]+$/)).default([]),
  })
  .strict();

const postSignArtifactsSchema = z
  .object({
    generateImmutablePdf: z.boolean(),
    storePdfHashSha256: z.boolean(),
    storeRenderedFieldSnapshot: z.boolean(),
    captureAuditMetadata: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const contractTemplateFieldDictionarySchema = z
  .object({
    template: templateMetaSchema,
    generationRules: generationRulesSchema,
    fields: z.array(contractTemplateFieldSchema).min(1),
    preSendValidation: preSendValidationSchema,
    postSignArtifacts: postSignArtifactsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const [index, field] of data.fields.entries()) {
      if (seen.has(field.placeholder)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate field placeholder: ${field.placeholder}`,
          path: ["fields", index, "placeholder"],
        });
      }
      seen.add(field.placeholder);
    }

    const knownPlaceholders = new Set(data.fields.map((f) => f.placeholder));
    const checks: Array<[string, string[]]> = [
      ["generationRules.allowManualOverrideBeforeSend", data.generationRules.allowManualOverrideBeforeSend],
      ["preSendValidation.blockOnMissingLegalIdentity", data.preSendValidation.blockOnMissingLegalIdentity],
      ["preSendValidation.blockOnMissingCommercialTerms", data.preSendValidation.blockOnMissingCommercialTerms],
      ["preSendValidation.blockOnMissingNoticeData", data.preSendValidation.blockOnMissingNoticeData],
    ];

    for (const [pathPrefix, values] of checks) {
      values.forEach((value, i) => {
        if (!knownPlaceholders.has(value)) {
          const [root, key] = pathPrefix.split(".");
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown placeholder reference: ${value}`,
            path: [root, key, i],
          });
        }
      });
    }
  });

export type ContractTemplateField = z.infer<typeof contractTemplateFieldSchema>;
export type ContractTemplateFieldDictionary = z.infer<typeof contractTemplateFieldDictionarySchema>;
