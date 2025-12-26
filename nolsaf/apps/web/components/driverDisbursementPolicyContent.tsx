"use client";

import Link from "next/link";
import { TermsSection } from "./Terms";

export const DRIVER_DISBURSEMENT_POLICY_LAST_UPDATED = "2025-01-20";

export const DRIVER_DISBURSEMENT_POLICY_SECTIONS: TermsSection[] = [
  {
    title: "1. General Overview",
    content: (
      <div className="space-y-4">
        <p>
          This Disbursement Policy governs how NoLSAF processes and disburses payments to Drivers for transportation services rendered through the NoLSAF platform. This policy applies exclusively to Drivers who are registered and active on the platform. All disbursements are processed digitally in accordance with NoLSAF's cashless payment principle, as outlined in section 1.3.4 of our <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>.
        </p>
        <p>
          <strong>1.1 Applicability</strong><br />
          This policy applies to all Drivers who receive earnings, commissions, or payouts through the NoLSAF platform. By registering as a Driver and accepting payments through NoLSAF, you acknowledge that you have read, understood, and agree to be bound by this Disbursement Policy.
        </p>
        <p>
          <strong>1.2 Cashless Payment Principle</strong><br />
          NoLSAF operates on a cashless payment system. All payments from Users are processed digitally through NoLSAF's secure payment system, and all disbursements to Drivers are made through digital payment methods only. Cash payments are not accepted for disbursements.
        </p>
        <p>
          <strong>1.3 Payment Flow</strong><br />
          As outlined in section 1.3.3 of our <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>, all payments made by Users are directed to NoLSAF accounts first. Subsequently, NoLSAF disburses the appropriate amounts to Drivers in accordance with established agreements and payout schedules defined in this Disbursement Policy.
        </p>
      </div>
    ),
  },
  {
    title: "2. Rights of Drivers",
    content: (
      <div className="space-y-4">
        <p>
          <strong>2.1 Right to Timely Disbursement</strong><br />
          Drivers have the right to receive disbursements in accordance with the payout schedules outlined in this policy. NoLSAF is committed to processing disbursements within the specified timeframes, subject to the conditions and requirements set forth in this policy.
        </p>
        <p>
          <strong>2.2 Right to Transparent Accounting</strong><br />
          Drivers have the right to access detailed records of all transactions, earnings, deductions, and disbursements through their dashboard on the NoLSAF platform. This includes the right to view transaction history, pending payments, and payment schedules.
        </p>
        <p>
          <strong>2.3 Right to Dispute Resolution</strong><br />
          Drivers have the right to dispute any discrepancies in their earnings, deductions, or disbursements. Disputes must be submitted through the appropriate channels as outlined in section 10 (Dispute Resolution) of this policy.
        </p>
        <p>
          <strong>2.4 Right to Payment Method Selection</strong><br />
          Drivers have the right to select their preferred digital payment method for receiving disbursements, subject to availability and the payment methods supported by NoLSAF as outlined in section 4 (Payment Methods) of this policy.
        </p>
        <p>
          <strong>2.5 Right to Information</strong><br />
          Drivers have the right to receive clear information about payment schedules, fees, deductions, and any changes to the disbursement policy. NoLSAF will provide advance notice of any significant changes as outlined in section 11 (Amendments to Disbursement Policy).
        </p>
      </div>
    ),
  },
  {
    title: "3. Responsibilities of Drivers",
    content: (
      <div className="space-y-4">
        <p>
          <strong>3.1 Account Information Accuracy</strong><br />
          Drivers are responsible for maintaining accurate and up-to-date payment account information in their NoLSAF dashboard. This includes bank account details, mobile money numbers, or other payment method information required for disbursements.
        </p>
        <p>
          <strong>3.1.1 Verification Requirements:</strong> All payment account information must be verified before disbursements can be processed. Drivers must provide valid, active payment accounts that match their registered identity on the platform.
        </p>
        <p>
          <strong>3.1.2 Update Obligations:</strong> Drivers must promptly update their payment information if their account details change, are closed, or become invalid. Failure to maintain accurate payment information may result in delayed or failed disbursements.
        </p>
        <p>
          <strong>3.2 Tax and Legal Compliance</strong><br />
          Drivers are solely responsible for complying with all applicable tax laws, regulations, and reporting requirements in their jurisdiction. NoLSAF may provide transaction records to assist with tax reporting, but Drivers are responsible for calculating, reporting, and paying all applicable taxes on their earnings.
        </p>
        <p>
          <strong>3.2.1 Tax Documentation:</strong> Drivers must provide accurate tax identification information when required by law or requested by NoLSAF. Failure to provide required tax information may result in withholding of disbursements until compliance is achieved.
        </p>
        <p>
          <strong>3.2.2 Record Keeping:</strong> Drivers are responsible for maintaining their own records of earnings and disbursements for tax and accounting purposes. NoLSAF provides transaction history through the platform, but Drivers should maintain independent records.
        </p>
        <p>
          <strong>3.3 Service Delivery Obligations</strong><br />
          Drivers must fulfill their service delivery obligations as outlined in the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link> to be eligible for disbursements. Disbursements are contingent upon successful completion of services and User satisfaction.
        </p>
        <p>
          <strong>3.3.1 Driver Responsibilities:</strong> Drivers must provide safe, reliable, and punctual transportation services as outlined in section 1.9.3 of the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>. Disbursements may be delayed or withheld if services are not delivered as agreed or if there are unresolved disputes with Users.
        </p>
        <p>
          <strong>3.4 Communication Responsibilities</strong><br />
          Drivers are responsible for responding promptly to communications from NoLSAF regarding disbursements, account verification, or payment-related matters. Failure to respond may result in delayed disbursements.
        </p>
        <p>
          <strong>3.5 Platform Compliance</strong><br />
          Drivers must comply with all NoLSAF platform policies, terms of service, and community guidelines to remain eligible for disbursements. Violations of platform policies may result in suspension of disbursements or account termination.
        </p>
      </div>
    ),
  },
  {
    title: "4. Payment Methods",
    content: (
      <div className="space-y-4">
        <p>
          <strong>4.1 Registration and Onboarding Requirements</strong><br />
          Drivers are strongly advised and encouraged to provide all payment method information and complete verification during the initial registration and onboarding process when joining the NoLSAF platform. Completing payment method setup and verification during registration ensures timely disbursements once services begin and earnings are generated.
        </p>
        <p>
          <strong>4.1.1 Registration Payment Setup:</strong> During the registration process, Drivers should provide their preferred payment method information, including all required account details, and initiate the verification process immediately upon account creation.
        </p>
        <p>
          <strong>4.1.2 Early Verification Benefits:</strong> Completing payment method verification during registration allows Drivers to receive disbursements immediately upon earning their first payments, without delays associated with post-registration verification processes.
        </p>
        <p>
          <strong>4.1.3 Multiple Payment Methods:</strong> Drivers may provide multiple payment method options during registration, though only one primary payment method will be active for disbursements at any given time. Having multiple verified payment methods provides flexibility and backup options.
        </p>
        <p>
          <strong>4.1.4 Registration Verification Process:</strong> The verification process during registration follows the same requirements outlined in section 4.4.1 (Verification Process), including OTP verification from NoLSAF and any additional verification steps required.
        </p>
        <p>
          <strong>4.1.5 Incomplete Registration Payment Setup:</strong> If payment method information is not provided or verified during registration, Drivers must complete this process before they can receive any disbursements. Earnings will accumulate in their account until payment method verification is completed.
        </p>
        <p>
          <strong>4.2 Digital Payment Methods</strong><br />
          All disbursements to Drivers are processed exclusively through digital payment methods. NoLSAF supports the following digital payment methods for disbursements:
        </p>
        <p>
          <strong>4.2.1 Mobile Money Services:</strong> M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, and other supported mobile money platforms. Drivers must provide valid, active mobile money numbers registered in their name.
        </p>
        <p>
          <strong>4.2.2 Bank Transfers:</strong> Direct bank transfers to verified bank accounts. Drivers must provide accurate bank account details including account number, bank name, branch, and account holder name matching their registered identity.
        </p>
        <p>
          <strong>4.2.3 Payment Platform Accounts:</strong> PayPal, Stripe, or other supported payment platform accounts, where applicable and supported by NoLSAF.
        </p>
        <p>
          <strong>4.3 Payment Method Selection</strong><br />
          Drivers must select and configure their preferred payment method through their NoLSAF dashboard. Only one primary payment method can be active at a time, though Drivers may update their payment method as needed. Drivers who completed payment method setup during registration can activate their verified payment method immediately.
        </p>
        <p>
          <strong>4.4 Verification Process:</strong> All payment methods must undergo verification before disbursements can be processed. Verification is mandatory and includes multiple security steps to ensure the security and accuracy of payment information. Drivers who complete verification during registration will have their payment methods ready for immediate use once they begin earning.
        </p>
        <p>
          <strong>4.4.1 One-Time Password (OTP) Verification:</strong> NoLSAF requires OTP verification as part of the payment method verification process. Drivers will receive a one-time password from NoLSAF via SMS or email to the registered contact information. This OTP must be entered within the specified time limit to complete the verification process. OTP verification is required both during registration and for any subsequent payment method changes.
        </p>
        <p>
          <strong>4.4.2 Additional Verification Methods:</strong> In addition to OTP verification, NoLSAF may require additional verification steps, including but not limited to:
        </p>
        <p>
          <strong>4.4.2.1</strong> Providing additional documentation such as bank statements, mobile money account statements, or proof of account ownership.
        </p>
        <p>
          <strong>4.4.2.2</strong> Completing identity verification to confirm that the payment account matches the registered Driver identity on the platform.
        </p>
        <p>
          <strong>4.4.2.3</strong> Verifying account details through test transactions or micro-deposits, where applicable and supported by the payment provider.
        </p>
        <p>
          <strong>4.4.2.4</strong> Providing additional contact information or emergency contact details for account recovery purposes.
        </p>
        <p>
          <strong>4.4.3 Verification Timeline:</strong> Verification processes may take 1-5 business days to complete, depending on the payment method selected and the completeness of documentation provided. Drivers will be notified of verification status through their dashboard and via email. Verification completed during registration may be processed more quickly as part of the onboarding workflow.
        </p>
        <p>
          <strong>4.4.4 Verification Failure:</strong> If verification fails due to incorrect information, expired OTP, or incomplete documentation, Drivers must restart the verification process. Multiple failed verification attempts may result in temporary restrictions on payment method changes or account activation.
        </p>
        <p>
          <strong>4.4.5 Verification Requirements:</strong> All verification requirements must be completed before any disbursements can be processed to the payment method. Unverified payment methods will not receive disbursements, and earnings will remain in the Driver's account until verification is completed. Drivers are strongly advised to complete verification during registration to avoid delays in receiving their first disbursements.
        </p>
        <p>
          <strong>4.5 Payment Method Changes:</strong> Drivers may change their payment method through their dashboard, but all changes must undergo the same verification process outlined in section 4.4 above, including OTP verification from NoLSAF.
        </p>
        <p>
          <strong>4.5.1 Change Verification Requirements:</strong> When changing a payment method, Drivers must complete the full verification process, including OTP verification, before the new payment method can be activated for disbursements.
        </p>
        <p>
          <strong>4.5.2 Timing of Changes:</strong> Changes made during an active payout period may delay disbursements until verification is completed. Drivers are advised to update payment methods well in advance of expected payout dates to avoid delays.
        </p>
        <p>
          <strong>4.5.3 Previous Payment Method:</strong> The previous payment method will remain active for pending disbursements until the new payment method is fully verified and activated. Once the new payment method is verified, all future disbursements will be processed to the new method.
        </p>
        <p>
          <strong>4.5.4 Security Measures:</strong> Payment method changes are subject to additional security measures, including OTP verification, to prevent unauthorized changes and protect Driver accounts.
        </p>
        <p>
          <strong>4.6 Payment Method Limitations</strong><br />
          Some payment methods may have limitations, including minimum disbursement amounts, maximum transaction limits, or geographic restrictions. Drivers will be informed of any applicable limitations when selecting their payment method during registration or when updating payment methods.
        </p>
        <p>
          <strong>4.7 Failed Disbursements</strong><br />
          If a disbursement fails due to incorrect payment information, closed accounts, or other payment method issues, NoLSAF will attempt to notify the Driver. The Driver must update their payment information promptly and complete verification. Failed disbursements may incur additional processing fees as outlined in section 6 (Fees and Deductions).
        </p>
      </div>
    ),
  },
  {
    title: "5. Payout Schedules and Claims",
    content: (
      <div className="space-y-4">
        <p>
          <strong>5.1 Flexible Payout System</strong><br />
          NoLSAF operates a flexible, on-demand payout system that allows Drivers to claim their payouts when they choose, subject to eligibility requirements and time limitations outlined in this section. Drivers have the right to claim payouts through their dashboard once earnings become eligible.
        </p>
        <p>
          <strong>5.1.1 Driver Payout Eligibility:</strong> Drivers become eligible to claim payouts after completing trips and meeting the minimum trip completion requirements. Drivers can claim payouts for individual trips or accumulated earnings from multiple completed trips, subject to the time limitations outlined in section 5.2 below.
        </p>
        <p>
          <strong>5.1.1.1 Trip Completion Requirements:</strong> Drivers must complete trips as agreed and receive trip completion confirmation before earnings become eligible for payout claims. The specific number of trips or minimum earnings required may vary based on driver agreements.
        </p>
        <p>
          <strong>5.1.1.2 Individual or Accumulated Claims:</strong> Drivers can choose to claim payouts for individual completed trips or wait to accumulate earnings from multiple trips before claiming. Drivers have the flexibility to claim payouts based on their preferences and financial needs.
        </p>
        <p>
          <strong>5.1.2 Payout Claim Process:</strong> Drivers can initiate payout claims through their NoLSAF dashboard using the established claim process. The claim process includes verification steps to ensure security and accuracy.
        </p>
        <p>
          <strong>5.2 Time Limitations for Unclaimed Payouts</strong><br />
          To ensure timely disbursement and prevent excessive accumulation of unclaimed funds, NoLSAF has established time limitations for unclaimed payouts.
        </p>
        <p>
          <strong>5.2.1 Maximum Unclaimed Period:</strong> Drivers must claim their payouts within a maximum period that does not exceed the agreed payout schedule. Unclaimed payouts exceeding the maximum period will be automatically processed according to the standard payout schedule or as agreed between the Driver and NoLSAF.
        </p>
        <p>
          <strong>5.2.2 Automatic Disbursement:</strong> If Drivers do not claim their payouts within the maximum unclaimed period, NoLSAF will automatically process the disbursement according to the established payout schedule or agreement. Drivers will be notified before automatic disbursement occurs.
        </p>
        <p>
          <strong>5.2.3 Notification of Unclaimed Payouts:</strong> NoLSAF will send notifications to Drivers when payouts become eligible for claim and as the maximum unclaimed period approaches. Notifications will be sent through the dashboard and via email to ensure Drivers are aware of their available payouts.
        </p>
        <p>
          <strong>5.3 Payout Agreements</strong><br />
          Drivers may enter into specific payout agreements with NoLSAF that establish customized payout schedules, subject to the limitations outlined in this section.
        </p>
        <p>
          <strong>5.3.1 Daily Payout Agreements:</strong> Drivers may request daily payout agreements, where eligible earnings are automatically disbursed on a daily basis. Daily payout agreements are subject to minimum threshold requirements and payment method limitations.
        </p>
        <p>
          <strong>5.3.2 Weekly Payout Agreements:</strong> Drivers may request weekly payout agreements, where eligible earnings are automatically disbursed on a weekly basis. Weekly payout agreements are the maximum frequency allowed, and no payout agreements may exceed weekly disbursements.
        </p>
        <p>
          <strong>5.3.3 Agreement Requirements:</strong> Payout agreements must be established in writing through the NoLSAF platform and are subject to approval by NoLSAF. Agreements may include specific terms regarding payout frequency, minimum thresholds, and processing times.
        </p>
        <p>
          <strong>5.3.4 Agreement Modifications:</strong> Drivers may request modifications to their payout agreements, but changes are subject to approval and may require a verification period before taking effect. No payout agreement may exceed weekly disbursement frequency.
        </p>
        <p>
          <strong>5.4 Disbursement Processing Time</strong><br />
          Once a payout claim is initiated or an automatic disbursement is triggered, NoLSAF processes disbursements within specified timeframes.
        </p>
        <p>
          <strong>5.4.1 Standard Processing Time:</strong> Disbursements are typically processed within 30 minutes to 24 hours after a payout claim is initiated or an automatic disbursement is triggered. The exact processing time depends on the payment method selected, verification status, and system availability.
        </p>
        <p>
          <strong>5.4.2 Processing Time Factors:</strong> Processing times may vary based on: payment method selected (mobile money may be faster than bank transfers), account verification status, system maintenance, payment provider processing times, and business days versus weekends or holidays.
        </p>
        <p>
          <strong>5.4.3 Delayed Disbursements:</strong> If a disbursement is delayed beyond 24 hours after claim initiation or automatic trigger, Drivers should contact NoLSAF support immediately. NoLSAF will investigate the delay and provide updates on the disbursement status.
        </p>
        <p>
          <strong>5.4.4 Support Contact for Delays:</strong> Drivers experiencing disbursement delays beyond 24 hours should contact NoLSAF support at <a href="mailto:info@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">info@nolsaf.com</a> or through the <Link href="/help" className="text-blue-600 hover:text-blue-800 underline">Help Center</Link>. Support team will investigate and resolve delays promptly.
        </p>
        <p>
          <strong>5.4.5 NoLSAF Notifications:</strong> NoLSAF will provide notifications to Drivers in case of disbursement delays, system issues, or other circumstances that may affect payout processing. Notifications will be sent through the dashboard and via email.
        </p>
        <p>
          <strong>5.5 Minimum Payout Threshold</strong><br />
          NoLSAF may establish minimum payout thresholds to ensure efficient processing and reduce transaction costs. Earnings below the minimum threshold will accumulate in the Driver's account until the threshold is reached or until a payout claim is made, whichever comes first.
        </p>
        <p>
          <strong>5.5.1 Threshold Amounts:</strong> Minimum payout thresholds may vary by payment method and will be clearly communicated to Drivers through their dashboard. Thresholds may be adjusted with advance notice as outlined in section 11 (Amendments to Disbursement Policy).
        </p>
        <p>
          <strong>5.5.2 Threshold Exceptions:</strong> Drivers may be able to claim payouts below the minimum threshold in certain circumstances, such as account closure, termination of services, or special agreements with NoLSAF. Such exceptions are subject to approval and may incur additional processing fees.
        </p>
        <p>
          <strong>5.6 Payout Processing Time by Payment Method</strong><br />
          Once a disbursement is initiated, the time for funds to appear in the Driver's account depends on the payment method selected. Processing times may vary:
        </p>
        <p>
          <strong>5.6.1 Mobile Money:</strong> Typically 30 minutes to 3 business days after payout initiation, with most transactions processed within 24 hours.
        </p>
        <p>
          <strong>5.6.2 Bank Transfers:</strong> Typically 1-5 business days after payout initiation, depending on the bank and country.
        </p>
        <p>
          <strong>5.6.3 Payment Platforms:</strong> Processing times vary by platform and may take 1-7 business days.
        </p>
      </div>
    ),
  },
  {
    title: "6. Fees and Deductions",
    content: (
      <div className="space-y-4">
        <p>
          <strong>6.1 Commission and Service Fees</strong><br />
          NoLSAF charges commissions and service fees on trips and services, which are deducted from gross earnings before disbursement. The commission structure and rates are established in the agreement between NoLSAF and each Driver during the registration process.
        </p>
        <p>
          <strong>6.1.1 Commission Rates:</strong> Commission rates may vary based on service category, volume, or special agreements established during registration. Drivers can view their applicable commission rates through their dashboard. The commission rate agreed upon during registration will be applied consistently unless modified through mutual agreement or as outlined in section 11 (Amendments to Disbursement Policy).
        </p>
        <p>
          <strong>6.1.2 Transparent Deductions:</strong> All commission and service fee deductions are clearly itemized in transaction records and payout statements. Drivers can view detailed breakdowns of all deductions and commission calculations through their dashboard.
        </p>
        <p>
          <strong>6.2 Transaction and Processing Fees</strong><br />
          Drivers may be subject to transaction fees or processing fees associated with disbursements, depending on the payment method selected. These fees are deducted from the disbursement amount.
        </p>
        <p>
          <strong>6.2.1 Payment Method Fees:</strong> Different payment methods may have different fee structures. Drivers will be informed of applicable fees when selecting their payment method.
        </p>
        <p>
          <strong>6.2.2 Failed Transaction Fees:</strong> If a disbursement fails due to incorrect payment information provided by the Driver, additional fees may apply for reprocessing. Drivers are responsible for ensuring accurate payment information.
        </p>
        <p>
          <strong>6.3 Penalties and Fines</strong><br />
          Drivers may be subject to penalties or fines for violations of platform policies, terms of service, or failure to deliver services as agreed. These penalties will be deducted from earnings before disbursement.
        </p>
        <p>
          <strong>6.4 Tax Withholding</strong><br />
          NoLSAF may be required by law to withhold taxes from disbursements in certain jurisdictions. If tax withholding is required, the withheld amount will be deducted from the disbursement, and Drivers will receive appropriate tax documentation.
        </p>
      </div>
    ),
  },
  {
    title: "7. Earnings Calculation",
    content: (
      <div className="space-y-4">
        <p>
          <strong>7.1 Gross Earnings</strong><br />
          Gross earnings for Drivers are calculated based on completed trips, distance traveled, time, and applicable rates as established in the driver agreement and platform pricing structure.
        </p>
        <p>
          <strong>7.2 Net Earnings</strong><br />
          Net earnings are calculated by subtracting all applicable deductions from gross earnings, including but not limited to: commissions, service fees, transaction fees, penalties, and tax withholdings.
        </p>
        <p>
          <strong>7.3 Earnings Statements</strong><br />
          Drivers can access detailed earnings statements through their NoLSAF dashboard, showing gross earnings, all deductions, and net earnings for each transaction and payout period.
        </p>
        <p>
          <strong>7.4 Currency</strong><br />
          Earnings are calculated and disbursed in the local currency as specified in section 1.5 of the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>. Currency conversion, if applicable, will be processed at the exchange rate in effect at the time of disbursement.
        </p>
      </div>
    ),
  },
  {
    title: "8. Duties of Drivers",
    content: (
      <div className="space-y-4">
        <p>
          <strong>8.1 Duty to Maintain Accurate Information</strong><br />
          Drivers have a duty to maintain accurate, current, and complete information in their NoLSAF accounts, including payment information, contact details, and identification documents. This duty is ongoing and requires prompt updates when information changes.
        </p>
        <p>
          <strong>8.2 Duty to Deliver Services</strong><br />
          Drivers have a duty to deliver transportation services as agreed and described in service agreements. This duty includes meeting quality standards, adhering to schedules, and fulfilling all service obligations as outlined in the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>.
        </p>
        <p>
          <strong>8.2.1 Driver Duties:</strong> Drivers must provide safe, reliable, and punctual transportation services, maintain valid licenses and insurance, ensure vehicle safety, and comply with all traffic laws and regulations as outlined in section 1.9.3 of the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>.
        </p>
        <p>
          <strong>8.3 Duty to Resolve Disputes</strong><br />
          Drivers have a duty to cooperate in resolving disputes with Users or NoLSAF. This includes responding to dispute notifications, providing requested information, and participating in dispute resolution processes in good faith.
        </p>
        <p>
          <strong>8.4 Duty to Comply with Platform Policies</strong><br />
          Drivers have a duty to comply with all NoLSAF platform policies, terms of service, community guidelines, and applicable laws and regulations. Non-compliance may result in suspension of disbursements or account termination.
        </p>
        <p>
          <strong>8.5 Duty to Report Issues</strong><br />
          Drivers have a duty to promptly report any issues, errors, or discrepancies related to their earnings, disbursements, or account information to NoLSAF through the appropriate support channels.
        </p>
        <p>
          <strong>8.6 Duty to Maintain Service Standards</strong><br />
          Drivers have a duty to maintain high service standards and professional conduct, as their performance directly impacts User satisfaction and the reputation of the NoLSAF platform.
        </p>
      </div>
    ),
  },
  {
    title: "9. NoLSAF's Rights and Responsibilities",
    content: (
      <div className="space-y-4">
        <p>
          <strong>9.1 Right to Verify and Audit</strong><br />
          NoLSAF reserves the right to verify, audit, and review all transactions, earnings calculations, and disbursements. This includes the right to request additional documentation, verify service delivery, and investigate any discrepancies or suspicious activity.
        </p>
        <p>
          <strong>9.2 Right to Withhold Disbursements</strong><br />
          NoLSAF reserves the right to withhold, delay, or suspend disbursements in cases of: pending disputes, suspected fraud or policy violations, incomplete account verification, tax compliance issues, or other circumstances that require investigation or resolution.
        </p>
        <p>
          <strong>9.3 Right to Deduct Amounts</strong><br />
          NoLSAF reserves the right to deduct amounts from earnings or future disbursements for: penalties, fees, tax withholdings, or amounts owed to NoLSAF or Users.
        </p>
        <p>
          <strong>9.4 Responsibility to Process Disbursements</strong><br />
          NoLSAF has a responsibility to process disbursements accurately and in accordance with the payout schedules and terms outlined in this policy, subject to the conditions and requirements set forth herein.
        </p>
        <p>
          <strong>9.5 Responsibility to Provide Transparency</strong><br />
          NoLSAF has a responsibility to provide Drivers with transparent, accurate, and accessible information about their earnings, deductions, and disbursements through the platform dashboard.
        </p>
        <p>
          <strong>9.6 Responsibility to Secure Transactions</strong><br />
          NoLSAF has a responsibility to maintain secure payment processing systems and protect Driver financial information, as outlined in section 1.9.1(c) of the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>.
        </p>
      </div>
    ),
  },
  {
    title: "10. Dispute Resolution",
    content: (
      <div className="space-y-4">
        <p>
          <strong>10.1 General Overview</strong><br />
          This section outlines the dispute resolution process between Drivers and NoLSAF regarding earnings, deductions, disbursements, and other payment-related issues. Drivers are required to cooperate fully with NoLSAF's established dispute resolution measures to ensure fair and timely resolution of all conflicts.
        </p>
        <p>
          <strong>10.2 Scope of Disputes</strong><br />
          Disputes covered under this section include, but are not limited to: earnings calculations, commission deductions, fee assessments, disbursement delays, payment method issues, and other financial adjustments.
        </p>
        <p>
          <strong>10.3 Dispute Submission</strong><br />
          Drivers who have concerns or disputes regarding their earnings, deductions, or disbursements should submit their dispute through the NoLSAF platform support system or by contacting NoLSAF at <a href="mailto:info@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">info@nolsaf.com</a> or through the <Link href="/help" className="text-blue-600 hover:text-blue-800 underline">Help Center</Link>.
        </p>
        <p>
          <strong>10.4 Dispute Documentation</strong><br />
          Drivers must provide detailed documentation supporting their dispute, including transaction records, screenshots, emails, trip completion confirmations, or other relevant evidence. Disputes without supporting documentation may not be processed.
        </p>
        <p>
          <strong>10.5 Dispute Review Process</strong><br />
          NoLSAF will review disputes within 14-21 business days of submission. During the review process, NoLSAF may request additional information or documentation. Drivers must respond promptly to such requests.
        </p>
        <p>
          <strong>10.6 Dispute Resolution Outcomes</strong><br />
          Dispute resolutions may result in: correction of earnings or disbursements, adjustment of deductions, reversal of charges, or confirmation that the original calculation was correct. NoLSAF's decision on disputes is final, subject to applicable legal rights.
        </p>
        <p>
          <strong>10.7 Appeal Process</strong><br />
          If a Driver disagrees with a dispute resolution, they may submit one appeal within 14 days of the resolution, providing new evidence or information that was not previously considered. NoLSAF's decision on appeals is final.
        </p>
      </div>
    ),
  },
  {
    title: "11. Amendments to Disbursement Policy",
    content: (
      <div className="space-y-4">
        <p>
          <strong>11.1 Policy Changes</strong><br />
          NoLSAF reserves the right to amend this Disbursement Policy at any time to reflect changes in business practices, legal requirements, payment processing capabilities, or industry standards. Significant changes will be communicated to Drivers via email or through notifications on the platform at least 21 days prior to the changes taking effect.
        </p>
        <p>
          <strong>11.2 Applicability</strong><br />
          The version of the Disbursement Policy in effect at the time a service is rendered or a disbursement is processed will apply to that transaction. Drivers are encouraged to review the current Disbursement Policy regularly.
        </p>
        <p>
          <strong>11.3 Acceptance</strong><br />
          By continuing to use the NoLSAF platform and receive disbursements after policy changes take effect, Drivers acknowledge and agree to be bound by the updated Disbursement Policy. If Drivers do not agree with the updated policy, they should discontinue using the platform for receiving payments.
        </p>
      </div>
    ),
  },
  {
    title: "12. Confidentiality",
    content: (
      <div className="space-y-4">
        <p>
          <strong>12.1 Information Protection</strong><br />
          NoLSAF is committed to maintaining the confidentiality of all financial information, payment details, earnings data, and account information related to Drivers. All disbursement-related information is treated as confidential and is protected in accordance with our <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</Link>.
        </p>
        <p>
          <strong>12.2 Disclosure Limitations</strong><br />
          NoLSAF will not disclose Driver financial information, earnings, or disbursement details to third parties except as required by law, as necessary to process disbursements, or with explicit consent from the Driver.
        </p>
        <p>
          <strong>12.3 Data Security</strong><br />
          NoLSAF employs industry-standard security measures to protect all financial and payment information. Drivers are responsible for maintaining the confidentiality of their account credentials and should not share their login information with unauthorized parties.
        </p>
        <p>
          <strong>12.4 Authorized Access</strong><br />
          Drivers may access their own disbursement information through their secure dashboard. NoLSAF personnel with authorized access to disbursement information are bound by confidentiality obligations and may only access such information for legitimate business purposes.
        </p>
      </div>
    ),
  },
  {
    title: "13. Termination of Disbursement Policy",
    content: (
      <div className="space-y-4">
        <p>
          <strong>13.1 Policy Termination</strong><br />
          This Disbursement Policy remains in effect for as long as Drivers are registered and active on the NoLSAF platform and receiving disbursements. The policy may be terminated or replaced by NoLSAF at any time, subject to the notice requirements outlined in section 11 (Amendments to Disbursement Policy).
        </p>
        <p>
          <strong>13.2 Driver Account Termination</strong><br />
          For Drivers, the following circumstances will be considered as termination of this Disbursement Policy:
        </p>
        <p>
          <strong>13.2.1 Account Deletion:</strong> If a Driver deletes their account, this Disbursement Policy will be terminated for that Driver. Outstanding earnings will be processed in accordance with the terms in effect at the time of account deletion, subject to any holds, disputes, or obligations that may delay or prevent disbursement.
        </p>
        <p>
          <strong>13.2.2 Account Suspension:</strong> Any suspension from accessing the NoLSAF platform, whether temporary or permanent, will be considered as termination of this Disbursement Policy for the affected Driver. During suspension, disbursements will be withheld, and final disbursements will be processed only upon resolution of the suspension or permanent account termination.
        </p>
        <p>
          <strong>13.3 Outstanding Obligations</strong><br />
          Termination of this policy or a Driver's account does not relieve either party of outstanding obligations, including but not limited to: pending disbursements, penalties, or amounts owed to NoLSAF or Users.
        </p>
        <p>
          <strong>13.4 Final Disbursements</strong><br />
          Upon account termination, deletion, or suspension, NoLSAF will process final disbursements for any outstanding earnings, subject to verification, dispute resolution, and compliance with all applicable policies. Drivers must ensure their payment information remains valid and verified to receive final disbursements.
        </p>
      </div>
    ),
  },
  {
    title: "14. Contact Information",
    content: (
      <div className="space-y-4">
        <p>
          For questions, concerns, or assistance regarding this Disbursement Policy, earnings, or disbursements, Drivers can contact NoLSAF:
        </p>
        <p>
          <strong>Email:</strong> <a href="mailto:info@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">info@nolsaf.com</a><br />
          <strong>Support Page:</strong> <Link href="/help" className="text-blue-600 hover:text-blue-800 underline">Help Center</Link><br />
          <strong>Platform:</strong> Access customer support through your Driver dashboard
        </p>
        <p>
          Our support team is available to assist with disbursement inquiries, payment method setup, earnings questions, and dispute resolution.
        </p>
      </div>
    ),
  },
  {
    title: "15. Glossary of Terms",
    content: (
      <div className="space-y-4">
        <p>
          This glossary defines key terms used throughout this Disbursement Policy to improve understanding and accessibility.
        </p>
        <p>
          <strong>Commission:</strong> A fee charged by NoLSAF on trips and services, which is deducted from gross earnings before disbursement. Commission rates are agreed upon between NoLSAF and Drivers during registration.
        </p>
        <p>
          <strong>Disbursement:</strong> The process of transferring earnings from NoLSAF to Drivers through digital payment methods. Disbursements are processed according to payout schedules and terms outlined in this policy.
        </p>
        <p>
          <strong>Driver:</strong> An individual registered on the NoLSAF platform who provides transportation services to Users. Drivers receive disbursements for completed trips according to the terms of this policy.
        </p>
        <p>
          <strong>Earnings:</strong> The amount of money earned by Drivers for services rendered through the NoLSAF platform. Earnings include gross earnings (before deductions) and net earnings (after deductions).
        </p>
        <p>
          <strong>Gross Earnings:</strong> The total amount earned by Drivers from completed trips, before any deductions for commissions, fees, or other adjustments.
        </p>
        <p>
          <strong>Mobile Money:</strong> Digital payment services such as M-Pesa, Airtel Money, Tigo Pesa, and HaloPesa that allow money transfers through mobile devices. Mobile money is one of the supported digital payment methods for disbursements.
        </p>
        <p>
          <strong>Net Earnings:</strong> The amount remaining after all deductions (commissions, fees, penalties, tax withholdings) are subtracted from gross earnings. Net earnings represent the actual amount disbursed to Drivers.
        </p>
        <p>
          <strong>NoLSAF:</strong> The platform and service provider that facilitates bookings, payments, and disbursements between Users and Drivers.
        </p>
        <p>
          <strong>OTP (One-Time Password):</strong> A temporary security code sent by NoLSAF via SMS or email to verify payment method information. OTP verification is required during registration and for payment method changes.
        </p>
        <p>
          <strong>Payout:</strong> The actual transfer of funds to Drivers. Payouts are processed according to payout schedules, which may be flexible (on-demand) or scheduled (daily/weekly), as outlined in section 5 of this policy.
        </p>
        <p>
          <strong>Service Fees:</strong> Additional fees charged by NoLSAF for platform services, separate from commission fees. Service fees are deducted from gross earnings before disbursement.
        </p>
        <p>
          <strong>Trip:</strong> A transportation service provided by a Driver to a User through the NoLSAF platform. A trip becomes eligible for earnings upon completion and verification.
        </p>
        <p>
          <strong>User:</strong> An individual who books transportation services through the NoLSAF platform. Users make payments to NoLSAF, which are then disbursed to Drivers after service completion.
        </p>
        <p>
          <strong>Verification:</strong> The process of confirming the accuracy and validity of payment method information, account details, and identity. Verification includes OTP confirmation and may require additional documentation or steps before disbursements can be processed.
        </p>
      </div>
    ),
  },
  {
    title: "16. Acknowledgment and Acceptance",
    content: (
      <div className="space-y-4">
        <p>
          By registering as a Driver on the NoLSAF platform and accepting disbursements, you acknowledge that you have read, understood, and agree to be bound by this Disbursement Policy. You further acknowledge that you understand your rights, responsibilities, and duties as outlined in this policy.
        </p>
        <p>
          Drivers are encouraged to review this Disbursement Policy regularly and contact NoLSAF support if they have any questions or require clarification about any aspect of this policy. NoLSAF is committed to providing clear, fair, and transparent disbursement terms to ensure a positive experience for all Drivers.
        </p>
        <p>
          This Disbursement Policy works in conjunction with the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link> and other applicable NoLSAF policies. Drivers must comply with all applicable policies to remain eligible for disbursements.
        </p>
      </div>
    ),
  },
];
