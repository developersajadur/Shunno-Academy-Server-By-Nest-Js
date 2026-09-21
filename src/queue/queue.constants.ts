export const EMAIL_QUEUE_NAME = 'shunno-email-queue';
export const ENROLLMENT_QUEUE_NAME = 'shunno-enrollment-queue';

export type EmailTemplateType =
  | 'WELCOME'
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'PAYMENT_SUBMITTED'
  | 'ENROLLMENT_APPROVED'
  | 'INQUIRY_RECEIVED'
  | 'PROMOTIONAL_CUSTOM';

export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: EmailTemplateType;
  context: Record<string, any>;
}

export interface EnrollmentJobData {
  enrollmentId: string;
  courseId: string;
  action: 'APPROVED' | 'REJECTED' | 'CREATED';
}
