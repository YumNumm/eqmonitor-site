import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/**
 * ベータプログラム登録完了メール。
 *
 * このコンポーネントはビルド時 (`pnpm build:emails`) に静的 HTML へレンダリングされ、
 * `src/emails/beta-registered.ts` に出力される。Worker ランタイムは生成済み HTML
 * 文字列のみを読み込み、`{{GREETING}}` プレースホルダを宛先名で置換して送信する。
 */

// ランタイムで置換されるプレースホルダ。
// JSX のテキストノードに `{{...}}` を直接書くとオブジェクト式と解釈されるため、
// 文字列リテラルとして埋め込む。
const GREETING = '{{GREETING}}'

// サイトのデザイントークン (src/styles/app.css の eqmonitor テーマ) に合わせる。
const colors = {
  base100: '#0c0f1a',
  base200: '#141826',
  base300: '#232a40',
  baseContent: '#f8f7fd',
  primary: '#415EC1',
  brandFrom: '#3B88E6',
  brandMid: '#415EC1',
  brandTo: '#463AA2',
  accent: '#5be0d8',
}

const fontFamily =
  "'Google Sans Flex', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Segoe UI', sans-serif"

const SITE_URL = 'https://eqmonitor.app'
const TESTFLIGHT_URL = 'https://apps.apple.com/app/testflight/id899247664'

export function BetaRegisteredEmail() {
  return (
    <Html lang="ja">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>
        EQMonitor v3 ベータプログラムへの登録が完了しました。TestFlight からの招待をお待ちください。
      </Preview>
      <Body style={body}>
        <Container style={outer}>
          {/* ブランドヘッダー */}
          <Section style={header}>
            <table cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={{ paddingRight: '12px', verticalAlign: 'middle' }}>
                    <Img
                      src={`${SITE_URL}/favicon.webp`}
                      width="40"
                      height="40"
                      alt="EQMonitor"
                      style={{ borderRadius: '10px', display: 'block' }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={brandWordmark}>EQMonitor</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* 本文カード */}
          <Section style={card}>
            <Section style={cardInner}>
              <Heading style={heading}>
                ベータプログラムへの登録が完了しました
              </Heading>

              <Text style={paragraph}>{GREETING}</Text>

              <Text style={paragraph}>
                EQMonitor v3 ベータプログラムへの登録が完了し、TestFlight
                のテスターに追加されました。
              </Text>

              <Text style={paragraph}>
                まもなく Apple から TestFlight の招待メールが届きます。下のボタンから
                TestFlight アプリをインストールのうえ、招待を承認してベータ版の利用を開始してください。
              </Text>

              <Section style={{ textAlign: 'center', margin: '32px 0' }}>
                <Button href={TESTFLIGHT_URL} style={primaryButton}>
                  TestFlight をインストール
                </Button>
              </Section>

              <Hr style={hr} />

              <Heading as="h2" style={subHeading}>
                次のステップ
              </Heading>
              <Text style={stepText}>
                <span style={stepNumber}>1.</span> TestFlight アプリをインストール
              </Text>
              <Text style={stepText}>
                <span style={stepNumber}>2.</span> Apple から届く招待メールを承認
              </Text>
              <Text style={stepText}>
                <span style={stepNumber}>3.</span> EQMonitor をインストール
              </Text>

              <Hr style={hr} />

              <Text style={noteText}>
                ご不明な点やフィードバックがありましたら、このメールへの返信、または{' '}
                <Link href={`${SITE_URL}/contact`} style={inlineLink}>
                  お問い合わせフォーム
                </Link>{' '}
                からお気軽にご連絡ください。
              </Text>
            </Section>
          </Section>

          {/* フッター */}
          <Section style={footer}>
            <Text style={footerLinks}>
              <Link href={`${SITE_URL}/privacy_policy`} style={footerLink}>
                プライバシーポリシー
              </Link>
              <span style={footerSep}>·</span>
              <Link href={`${SITE_URL}/term_of_service`} style={footerLink}>
                利用規約
              </Link>
              <span style={footerSep}>·</span>
              <Link href={`${SITE_URL}/contact`} style={footerLink}>
                お問い合わせ
              </Link>
            </Text>
            <Text style={footerCredit}>
              EQMonitor is developed by{' '}
              <Link href="https://github.com/YumNumm" style={footerLink}>
                Ryotaro Onoue (aka. もぐもぐ)
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default BetaRegisteredEmail

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const body: React.CSSProperties = {
  margin: 0,
  padding: '32px 0',
  backgroundColor: colors.base100,
  color: colors.baseContent,
  fontFamily,
}

const outer: React.CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0 16px',
}

const header: React.CSSProperties = {
  padding: '8px 4px 24px',
}

const brandWordmark: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '0.01em',
  color: colors.baseContent,
}

const card: React.CSSProperties = {
  backgroundColor: colors.base200,
  border: `1px solid ${colors.base300}`,
  borderRadius: '16px',
  overflow: 'hidden',
}

const cardInner: React.CSSProperties = {
  padding: '32px',
}

const heading: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '22px',
  lineHeight: 1.4,
  fontWeight: 700,
  color: colors.baseContent,
}

const subHeading: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '15px',
  fontWeight: 700,
  color: colors.accent,
}

const paragraph: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '15px',
  lineHeight: 1.8,
  color: colors.baseContent,
}

const primaryButton: React.CSSProperties = {
  display: 'inline-block',
  padding: '13px 32px',
  borderRadius: '12px',
  backgroundColor: colors.primary,
  backgroundImage: `linear-gradient(to right, ${colors.brandFrom}, ${colors.brandMid}, ${colors.brandTo})`,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  letterSpacing: '0.01em',
}

const hr: React.CSSProperties = {
  margin: '28px 0',
  border: 'none',
  borderTop: `1px solid ${colors.base300}`,
}

const stepText: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '15px',
  lineHeight: 1.6,
  color: colors.baseContent,
}

const stepNumber: React.CSSProperties = {
  display: 'inline-block',
  width: '22px',
  color: colors.accent,
  fontWeight: 700,
}

const noteText: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  lineHeight: 1.7,
  color: 'rgba(248, 247, 253, 0.6)',
}

const inlineLink: React.CSSProperties = {
  color: colors.accent,
  textDecoration: 'underline',
}

const footer: React.CSSProperties = {
  padding: '24px 8px 8px',
  textAlign: 'center',
}

const footerLinks: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '12px',
  color: 'rgba(248, 247, 253, 0.6)',
}

const footerLink: React.CSSProperties = {
  color: 'rgba(248, 247, 253, 0.6)',
  textDecoration: 'none',
}

const footerSep: React.CSSProperties = {
  margin: '0 8px',
  color: 'rgba(248, 247, 253, 0.3)',
}

const footerCredit: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: 'rgba(248, 247, 253, 0.45)',
}
