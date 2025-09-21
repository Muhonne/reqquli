export class EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    console.log(`Sending verification email to ${email} with token ${token}`)
  }
}

export const emailService = new EmailService()