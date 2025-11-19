import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  resetUrl: string
  token: string
  userEmail: string
}

export const PasswordResetEmail = ({
  resetUrl,
  token,
  userEmail,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Réinitialisez votre mot de passe Wine Note</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🍷 Wine Note</Heading>
        <Heading style={h2}>Réinitialisation de mot de passe</Heading>
        
        <Text style={text}>
          Bonjour,
        </Text>
        
        <Text style={text}>
          Vous avez demandé à réinitialiser le mot de passe du compte associé à <strong>{userEmail}</strong>.
        </Text>
        
        <Text style={text}>
          Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
        </Text>
        
        <Button
          href={resetUrl}
          style={button}
        >
          Réinitialiser mon mot de passe
        </Button>
        
        <Text style={{ ...text, marginTop: '32px', marginBottom: '14px' }}>
          Ou copiez et collez ce code de sécurité temporaire :
        </Text>
        <code style={code}>{token}</code>
        
        <Text style={textMuted}>
          Ce lien et ce code sont valides pendant 1 heure.
        </Text>
        
        <Text style={textMuted}>
          Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.
        </Text>
        
        <Text style={footer}>
          <Link
            href="https://wine-note.app"
            target="_blank"
            style={{ ...link, color: '#898989' }}
          >
            Wine Note
          </Link>
          {' '}- Votre compagnon œnologique
          <br />
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#f6f6f6',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const h1 = {
  color: '#8B4513',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 10px',
  padding: '0',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 30px',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const textMuted = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0',
}

const button = {
  backgroundColor: '#8B4513',
  borderRadius: '6px',
  color: '#fff',
  display: 'block',
  fontSize: '16px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  textDecoration: 'none',
  padding: '14px 24px',
  margin: '24px auto',
  width: 'fit-content',
}

const link = {
  color: '#8B4513',
  textDecoration: 'underline',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '20px',
  marginTop: '40px',
  paddingTop: '20px',
  borderTop: '1px solid #eee',
  textAlign: 'center' as const,
}

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '6px',
  border: '1px solid #ddd',
  color: '#8B4513',
  fontSize: '18px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  letterSpacing: '2px',
  fontFamily: 'monospace',
}
