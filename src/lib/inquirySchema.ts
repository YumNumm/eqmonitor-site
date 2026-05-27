import * as v from 'valibot'

/**
 * 問い合わせフォームのユーザー入力スキーマ。
 * サーバー (API route) とクライアント (ContactForm) で共有する。
 */
export const ContactFormSchema = v.object({
  type: v.picklist(['inquiry', 'feedback', 'bug']),
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'お名前を入力してください'),
    v.maxLength(100, 'お名前が長すぎます'),
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'メールアドレスを入力してください'),
    v.email('メールアドレスの形式が不正です'),
  ),
  subject: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, '件名を入力してください'),
    v.maxLength(200, '件名が長すぎます'),
  ),
  message: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, '本文を入力してください'),
    v.maxLength(5000, '本文が長すぎます'),
  ),
})

export type ContactFormInput = v.InferInput<typeof ContactFormSchema>
