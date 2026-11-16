/**
 * The attributes that tie a form control to its error and hint, so a screen reader reads
 * them with the field and the red "invalid" style shows.
 *
 * Spread `control` on the input, select or textarea, give the error element `errorId`
 * and the hint element `hintId`:
 *
 *   const title = fieldA11y("title", { invalid: Boolean(errors.title) });
 *   <Input {...title.control} {...register("title")} />
 *   <FieldError id={title.errorId}>…</FieldError>
 */
export function fieldA11y(id: string, options: { invalid: boolean; hint?: boolean }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [options.invalid ? errorId : null, options.hint ? hintId : null]
    .filter(Boolean)
    .join(" ");
  return {
    control: {
      id,
      "aria-invalid": options.invalid || undefined,
      "aria-describedby": describedBy || undefined,
    },
    errorId,
    hintId,
  };
}
