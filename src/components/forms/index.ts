/**
 * Form Components
 * 
 * Consistent form patterns for the ARM platform.
 * 
 * @example
 * import { FormField, FormSection, FormActions, FormDivider } from '@/components/forms';
 * 
 * <form>
 *   <FormSection title="Basic Info" icon={User}>
 *     <FormField name="name" label="Name" required />
 *   </FormSection>
 *   
 *   <FormDivider label="Advanced" />
 *   
 *   <FormActions onSubmit={handleSubmit} onCancel={handleCancel} />
 * </form>
 */

export { FormField, type FormFieldProps } from './FormField';
export { FormSection, FormDivider, type FormSectionProps, type FormDividerProps } from './FormSection';
export { FormActions, type FormActionsProps } from './FormActions';
export { FormValidationSummary, RequiredFieldLegend, type FormValidationSummaryProps, type RequiredFieldLegendProps } from './FormValidation';
