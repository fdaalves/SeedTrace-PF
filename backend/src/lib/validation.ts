export const descriptorTypes = ['text', 'integer', 'decimal', 'boolean', 'option', 'range'] as const;
export const criticalities = ['low', 'medium', 'high', 'critical'] as const;

export type DescriptorType = (typeof descriptorTypes)[number];

export function requiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${field} must have at most ${maxLength} characters`);
  }
  return normalized;
}

export function optionalText(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new Error(`${field} must have at most ${maxLength} characters`);
  }
  return normalized;
}

export function normalizedCode(value: unknown, field = 'code', maxLength = 80) {
  const code = requiredText(value, field, maxLength);
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(code)) {
    throw new Error(`${field} may contain only letters, numbers, dot, underscore, slash and hyphen, with no spaces`);
  }
  return code;
}

export function finiteNumber(value: unknown, field: string, options: { min?: number; integer?: boolean } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`${field} must be greater than or equal to ${options.min}`);
  }
  return value;
}

export function optionalFiniteNumber(value: unknown, field: string, options: { min?: number; integer?: boolean } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  return finiteNumber(value, field, options);
}

export function normalizeOptionList(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error('allowed_values must be an array');

  const normalized = value.map((item) => {
    if (typeof item !== 'string' || !item.trim()) throw new Error('allowed_values cannot contain blank values');
    return item.trim();
  });
  const unique = [...new Set(normalized)];
  if (unique.length !== normalized.length) throw new Error('allowed_values cannot contain duplicates');
  return unique;
}

export function assertDescriptorDefinition(input: {
  data_type: unknown;
  criticality?: unknown;
  allowed_values?: unknown;
}) {
  if (typeof input.data_type !== 'string' || !descriptorTypes.includes(input.data_type as DescriptorType)) {
    throw new Error(`data_type must be one of: ${descriptorTypes.join(', ')}`);
  }

  if (input.criticality !== undefined && input.criticality !== null && input.criticality !== '') {
    if (typeof input.criticality !== 'string' || !criticalities.includes(input.criticality as (typeof criticalities)[number])) {
      throw new Error(`criticality must be one of: ${criticalities.join(', ')}`);
    }
  }

  const allowedValues = normalizeOptionList(input.allowed_values);
  if (input.data_type === 'option') {
    if (!allowedValues || allowedValues.length < 2) {
      throw new Error('option descriptors require at least two allowed_values');
    }
  } else if (allowedValues && allowedValues.length > 0) {
    throw new Error('allowed_values is only valid for option descriptors');
  }

  return allowedValues;
}

export type VarietalValueInput = {
  value_text?: unknown;
  value_number?: unknown;
  min_value?: unknown;
  max_value?: unknown;
  notes?: unknown;
};

export function validateVarietalValue(
  descriptor: { data_type: string; allowed_values?: unknown },
  input: VarietalValueInput
) {
  const notes = optionalText(input.notes, 'notes', 2000);

  if (descriptor.data_type === 'text') {
    return { value_text: requiredText(input.value_text, 'value_text', 500), value_number: null, min_value: null, max_value: null, notes };
  }

  if (descriptor.data_type === 'option') {
    const valueText = requiredText(input.value_text, 'value_text', 500);
    const allowed = normalizeOptionList(descriptor.allowed_values) ?? [];
    if (!allowed.includes(valueText)) throw new Error(`value_text must be one of: ${allowed.join(', ')}`);
    return { value_text: valueText, value_number: null, min_value: null, max_value: null, notes };
  }

  if (descriptor.data_type === 'integer') {
    return { value_text: null, value_number: finiteNumber(input.value_number, 'value_number', { integer: true }), min_value: null, max_value: null, notes };
  }

  if (descriptor.data_type === 'decimal') {
    return { value_text: null, value_number: finiteNumber(input.value_number, 'value_number'), min_value: null, max_value: null, notes };
  }

  if (descriptor.data_type === 'range') {
    const min = finiteNumber(input.min_value, 'min_value');
    const max = finiteNumber(input.max_value, 'max_value');
    if (min > max) throw new Error('min_value cannot be greater than max_value');
    return { value_text: null, value_number: null, min_value: min, max_value: max, notes };
  }

  if (descriptor.data_type === 'boolean') {
    if (typeof input.value_text !== 'string' || !['true', 'false'].includes(input.value_text)) {
      throw new Error('boolean descriptors require value_text equal to true or false');
    }
    return { value_text: input.value_text, value_number: null, min_value: null, max_value: null, notes };
  }

  throw new Error('Unsupported descriptor data_type');
}

export function validationMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Invalid input';
}
