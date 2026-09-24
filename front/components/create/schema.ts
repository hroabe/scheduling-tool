/**
 * Validation schema of the create page. Error messages are i18n keys and are
 * translated where they are rendered (`t(error.message)`).
 */

import { z } from 'zod';

const emailSchema = z.string().email();

export function isValidEmail(value: string | undefined | null): boolean {
    return !!value && emailSchema.safeParse(value.trim()).success;
}

export const createFormSchema = z.object({
    name: z.string().trim().min(1, 'create.errors.nameRequired').max(200, 'create.errors.nameTooLong'),
    ownerName: z.string().trim().min(1, 'create.errors.ownerNameRequired').max(100, 'create.errors.ownerNameTooLong'),
    description: z.string().max(2000, 'create.errors.descriptionTooLong'),
    department: z.string().trim().max(200, 'create.errors.departmentTooLong'),
    ownerEmail: z
        .string()
        .trim()
        .max(254, 'create.errors.emailInvalid')
        .refine((v) => v === '' || isValidEmail(v), 'create.errors.emailInvalid'),
    notifyOnResponse: z.boolean(),
    editKey: z
        .string()
        .max(100, 'create.errors.editKeyTooLong')
        .refine((v) => v === '' || v.length >= 4, 'create.errors.editKeyTooShort'),
    deadline: z.string().refine((v) => !v || new Date(v).getTime() > Date.now(), 'create.errors.deadlinePast'),
    allowMaybe: z.boolean(),
});

export type CreateFormValues = z.infer<typeof createFormSchema>;

export const CREATE_FORM_DEFAULTS: CreateFormValues = {
    name: '',
    ownerName: '',
    description: '',
    department: '',
    ownerEmail: '',
    notifyOnResponse: false,
    editKey: '',
    deadline: '',
    allowMaybe: true,
};

/** Fields that live in the collapsed "advanced options" card */
export const OPTION_FIELDS: (keyof CreateFormValues)[] = [
    'description',
    'department',
    'ownerEmail',
    'notifyOnResponse',
    'editKey',
    'deadline',
    'allowMaybe',
];
