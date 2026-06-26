import * as v from 'valibot'

export const BetaRegistrationFormSchema = v.object({
  platform: v.picklist(['ios']),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'メールアドレスを入力してください'),
    v.email('メールアドレスの形式が不正です'),
  ),
  turnstileToken: v.pipe(
    v.string(),
    v.minLength(1, '認証を完了してください'),
  ),
})

export type BetaRegistrationFormInput = v.InferInput<
  typeof BetaRegistrationFormSchema
>
