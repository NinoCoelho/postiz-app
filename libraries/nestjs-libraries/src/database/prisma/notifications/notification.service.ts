import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import dayjs from 'dayjs';

@Injectable()
export class NotificationService {
  constructor(
    private _notificationRepository: NotificationsRepository,
    private _emailService: EmailService,
    private _organizationRepository: OrganizationRepository,
    private _workerServiceProducer: BullMqClient
  ) {}

  getMainPageCount(organizationId: string, userId: string) {
    return this._notificationRepository.getMainPageCount(
      organizationId,
      userId
    );
  }

  getNotifications(organizationId: string, userId: string) {
    return this._notificationRepository.getNotifications(
      organizationId,
      userId
    );
  }

  getNotificationsSince(organizationId: string, since: string) {
    return this._notificationRepository.getNotificationsSince(
      organizationId,
      since
    );
  }

  async inAppNotification(
    orgId: string,
    subject: string,
    message: string,
    sendEmail = false,
    digest = false
  ) {
    const date = new Date().toISOString();
    await this._notificationRepository.createNotification(orgId, message);
    
    if (!sendEmail) {
      return;
    }

    // Enhanced email for posting errors
    const isPostingError = subject.includes('Error posting');
    const emailSubject = isPostingError 
      ? `🚨 ${subject} - Postiz Alert` 
      : subject;
    
    const emailMessage = isPostingError 
      ? this.formatErrorEmailMessage(message, orgId)
      : message;

    if (digest && !isPostingError) { // Don't digest critical errors
      await ioRedis.watch('digest_' + orgId);
      const value = await ioRedis.get('digest_' + orgId);
      if (value) {
        return;
      }

      await ioRedis
        .multi()
        .set('digest_' + orgId, date)
        .expire('digest_' + orgId, 60)
        .exec();

      this._workerServiceProducer.emit('sendDigestEmail', {
        id: 'digest_' + orgId,
        options: {
          delay: 60000,
        },
        payload: {
          subject: emailSubject,
          org: orgId,
          since: date,
        },
      });

      return;
    }

    // Send immediate email for critical errors
    await this.sendEmailsToOrg(orgId, emailSubject, emailMessage);
  }

  private formatErrorEmailMessage(message: string, orgId: string): string {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ff4444; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 24px;">🚨 Postiz Alert</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Critical Error Detected</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
        <div style="background-color: #fff5f5; border-left: 4px solid #ff4444; padding: 15px; margin-bottom: 20px;">
          <pre style="white-space: pre-wrap; font-family: monospace; margin: 0; color: #333;">${message}</pre>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #0066cc; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #0066cc;">🔧 Next Steps:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333;">
            <li>Check your media format and specifications</li>
            <li>Verify your account connection is active</li>
            <li>Review platform-specific requirements</li>
            <li>Contact support if the issue persists</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px; text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
          <a href="${process.env.FRONTEND_URL}/launches" 
             style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            🔗 Go to Dashboard
          </a>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
          <p>Organization ID: ${orgId}</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>This is an automated alert from Postiz. Please do not reply to this email.</p>
        </div>
      </div>
    </div>
    `;
  }

  async sendEmailsToOrg(orgId: string, subject: string, message: string) {
    const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
    for (const user of userOrg?.users || []) {
      await this.sendEmail(user.user.email, subject, message);
    }
  }

  async sendEmail(to: string, subject: string, html: string, replyTo?: string) {
    await this._emailService.sendEmail(to, subject, html, replyTo);
  }

  hasEmailProvider() {
    return this._emailService.hasProvider();
  }
}
