import * as v from 'valibot'

export const BetaRegistrationFormSchema = v.object({
  platform: v.picklist(['ios']),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'メールアドレスを入力してください'),
    v.email('メールアドレスの形式が不正です'),
  ),
})

export type BetaRegistrationFormInput = v.InferInput<
  typeof BetaRegistrationFormSchema
>
