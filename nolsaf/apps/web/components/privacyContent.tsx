"use client";

import Link from "next/link";
import { TermsSection } from "./Terms";

export const PRIVACY_LAST_UPDATED = "2025-12-20";

export const PRIVACY_SECTIONS: TermsSection[] = [
  {
    title: "Overview",
    content: (
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            NoLSAF is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our platform to book accommodations, list properties, or provide transportation services. We collect information necessary to provide our services, including account details, booking information, payment data, and location information. We use this data to facilitate bookings, process payments, verify identities, improve our services, and communicate with you. We implement strong security measures to protect your information and only share data with trusted service providers and as required by law. You have rights to access, update, or delete your personal information at any time. By using NoLSAF, you consent to the practices described in this policy.
          </p>
        </div>

        <p>
          <strong>1.0 Introduction</strong><br />
          NoLSAF ("we," "us," or "our") respects your privacy and is committed to protecting your personal information. This Privacy Policy describes how we collect, use, disclose, store, and protect your personal data when you access or use our platform, website, mobile applications, and related services (collectively, the "Services"). This policy applies to all Users, property Owners, Drivers, and visitors to our platform.
        </p>

        <p>
          <strong>1.1 Scope</strong><br />
          This Privacy Policy applies to all personal information collected by NoLSAF through our Services, including but not limited to information provided during account registration, property listings, booking transactions, payment processing, customer support interactions, and use of our website and mobile applications.
        </p>

        <p>
          <strong>1.2 Consent</strong><br />
          By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with any part of this policy, please do not use our Services. Your continued use of our Services after any changes to this policy constitutes your acceptance of those changes.
        </p>

        <p>
          <strong>2.0 Information We Collect</strong><br />
          We collect various types of information to provide, maintain, and improve our Services. The information we collect depends on how you interact with our platform and the role you assume (User, Owner, or Driver).
        </p>

        <p>
          <strong>2.1 Information You Provide Directly</strong><br />
          We collect information that you voluntarily provide when using our Services, including;<br />
          <strong>2.1.1 Account Registration Information</strong><br />
          When you create an account, we collect;<br />
          a. Full name<br />
          b. Email address<br />
          c. Phone number (including country code)<br />
          d. Password (stored securely using encryption)<br />
          e. Role selection (User/Traveller, Owner, or Driver)<br />
          f. Profile photo or avatar (optional)<br />
          <em>Example: When you register as a property owner, we collect your name, email, and phone number to create your account and enable you to list properties and manage bookings.</em>
        </p>

        <p>
          <strong>2.1.2 Property Owner Information</strong><br />
          If you are a property Owner, we collect additional information including;<br />
          a. Property details (address, description, amenities, photos)<br />
          b. Property ownership documents (title deeds, rental agreements, business licenses)<br />
          c. Operating permits and licenses for short-term rentals<br />
          d. Tax compliance documentation<br />
          e. Bank account details for payouts (account name, bank name, account number, branch)<br />
          f. Mobile money provider and number for payouts (M-Pesa, Tigo Pesa, Airtel Money, etc.)<br />
          g. Payout preferences<br />
          <em>Example: To process your earnings from bookings, we need your bank account or mobile money details. This information is encrypted and only used for payment processing.</em>
        </p>

        <p>
          <strong>2.1.3 Driver Information</strong><br />
          If you are a Driver, we collect additional information including;<br />
          a. Vehicle information (make, model, license plate number)<br />
          b. Driver's license number and expiration date<br />
          c. Vehicle registration documents<br />
          d. Insurance information<br />
          e. Bank account or mobile money details for earnings<br />
          f. Location data (when providing transportation services)<br />
          <em>Example: We collect your vehicle and license information to verify your eligibility to provide transportation services and ensure passenger safety.</em>
        </p>

        <p>
          <strong>2.1.4 Booking Information</strong><br />
          When you make a booking, we collect;<br />
          a. Check-in and check-out dates<br />
          b. Number of guests<br />
          c. Special requests or preferences<br />
          d. Payment information (processed securely through third-party payment processors)<br />
          e. Communication preferences<br />
          <em>Example: We store your booking dates and guest count to facilitate your stay and ensure the property can accommodate your needs.</em>
        </p>

        <p>
          <strong>2.1.5 Communication Data</strong><br />
          We collect information from your communications with us, including;<br />
          a. Customer support inquiries and responses<br />
          b. Feedback and reviews you submit<br />
          c. Messages sent through our platform<br />
          d. Newsletter subscription preferences<br />
          <em>Example: If you contact our support team about a booking issue, we keep a record of that conversation to help resolve your concern and improve our services.</em>
        </p>

        <p>
          <strong>2.2 Information Collected Automatically</strong><br />
          When you use our Services, we automatically collect certain information about your device and usage patterns;<br />
          <strong>2.2.1 Device Information</strong><br />
          We collect information about the device you use to access our Services, including;<br />
          a. Device type (mobile, tablet, computer)<br />
          b. Operating system and version<br />
          c. Browser type and version<br />
          d. IP address<br />
          e. Unique device identifiers<br />
          <strong>2.2.2 Usage Information</strong><br />
          We collect information about how you interact with our Services, including;<br />
          a. Pages visited and time spent on pages<br />
          b. Search queries and filters used<br />
          c. Features accessed<br />
          d. Click patterns and navigation paths<br />
          e. Date and time of access<br />
          <strong>2.2.3 Location Information</strong><br />
          With your permission, we may collect location data, including;<br />
          a. GPS coordinates (for Drivers providing transportation services)<br />
          b. Approximate location based on IP address<br />
          c. Location preferences for property searches<br />
          <em>Example: If you're a driver using our app, we collect your real-time location to match you with nearby ride requests and help passengers track their rides.</em>
        </p>

        <p>
          <strong>2.3 Cookies and Similar Technologies</strong><br />
          We use cookies, local storage, and similar technologies to enhance your experience and collect information;<br />
          <strong>2.3.1 Essential Cookies</strong><br />
          These cookies are necessary for the platform to function, including;<br />
          a. Authentication tokens (stored securely)<br />
          b. Session management<br />
          c. User preferences (theme, language)<br />
          d. Shopping cart and booking information<br />
          <strong>2.3.2 Analytics Cookies</strong><br />
          We use analytics to understand how our Services are used and improve them;<br />
          a. Page views and user interactions<br />
          b. Performance metrics<br />
          c. Error tracking<br />
          <strong>2.3.3 Local Storage</strong><br />
          We use browser local storage to;<br />
          a. Remember your login status<br />
          b. Store user preferences (accepted policies, widget settings)<br />
          c. Cache data for faster loading<br />
          <em>Example: We store your authentication token in a secure cookie so you don't have to log in every time you visit our platform. You can clear your cookies at any time through your browser settings.</em>
        </p>

        <p>
          <strong>2.4 Information from Third Parties</strong><br />
          We may receive information about you from third-party sources, including;<br />
          a. Payment processors (Stripe, AzamPay, M-Pesa, etc.) - transaction status and payment method details<br />
          b. Social media platforms (if you choose to register or log in using social media)<br />
          c. Property verification services<br />
          d. Background check providers (for Drivers)<br />
          e. Government databases (for verification purposes)<br />
          <em>Example: When you pay for a booking using M-Pesa, the payment processor sends us confirmation that your payment was successful, along with the transaction reference number.</em>
        </p>

        <p>
          <strong>3.0 How We Use Your Information</strong><br />
          We use the information we collect for various purposes to provide, maintain, and improve our Services;
        </p>

        <p>
          <strong>3.1 Service Provision</strong><br />
          We use your information to;<br />
          a. Create and manage your account<br />
          b. Process and facilitate bookings<br />
          c. Verify your identity and eligibility (for Owners and Drivers)<br />
          d. Process payments and payouts<br />
          e. Communicate with you about bookings, services, and account matters<br />
          f. Provide customer support<br />
          g. Send booking confirmations, receipts, and updates<br />
          <em>Example: When you book a property, we use your email and phone number to send you booking confirmation, check-in instructions, and important updates about your stay.</em>
        </p>

        <p>
          <strong>3.2 Platform Operations</strong><br />
          We use your information to;<br />
          a. Verify property listings and ensure accuracy<br />
          b. Match Drivers with transportation requests<br />
          c. Facilitate communication between Users, Owners, and Drivers<br />
          d. Process reviews and ratings<br />
          e. Manage disputes and resolve issues<br />
          f. Enforce our Terms of Service and policies<br />
          <em>Example: We use property verification information to ensure that only legitimate, safe properties are listed on our platform, protecting both travelers and property owners.</em>
        </p>

        <p>
          <strong>3.3 Payment Processing</strong><br />
          We use payment information to;<br />
          a. Process booking payments from Users<br />
          b. Distribute payouts to Owners and Drivers<br />
          c. Handle refunds and cancellations<br />
          d. Prevent fraud and unauthorized transactions<br />
          e. Comply with financial regulations<br />
          <em>Example: When you pay for a booking, we securely transmit your payment details to our payment processor (like AzamPay or Stripe) to complete the transaction. We don't store your full credit card number.</em>
        </p>

        <p>
          <strong>3.4 Communication and Marketing</strong><br />
          With your consent, we may use your information to;<br />
          a. Send newsletters and promotional materials<br />
          b. Notify you about special offers and new features<br />
          c. Request feedback and reviews<br />
          d. Send important service updates and policy changes<br />
          <em>Example: If you subscribe to our newsletter, we'll send you updates about new properties, travel tips, and special deals. You can unsubscribe at any time.</em>
        </p>

        <p>
          <strong>3.5 Safety and Security</strong><br />
          We use your information to;<br />
          a. Verify identities and prevent fraud<br />
          b. Detect and prevent unauthorized access<br />
          c. Investigate suspicious activities<br />
          d. Ensure compliance with laws and regulations<br />
          e. Protect the safety of Users, Owners, and Drivers<br />
          <em>Example: If we detect unusual activity on your account (like multiple failed login attempts), we may temporarily lock your account and notify you to prevent unauthorized access.</em>
        </p>

        <p>
          <strong>3.6 Analytics and Improvement</strong><br />
          We use aggregated and anonymized data to;<br />
          a. Analyze usage patterns and trends<br />
          b. Improve our Services and user experience<br />
          c. Develop new features and functionality<br />
          d. Conduct research and statistical analysis<br />
          <em>Example: We analyze which property features are most searched for to help us improve our search functionality and help property owners understand what travelers are looking for.</em>
        </p>

        <p>
          <strong>4.0 Information Sharing and Disclosure</strong><br />
          We do not sell your personal information. We may share your information only in the following circumstances;
        </p>

        <p>
          <strong>4.1 Service Providers</strong><br />
          We share information with trusted third-party service providers who assist us in operating our platform, including;<br />
          a. Payment processors (Stripe, AzamPay, M-Pesa, Tigo Pesa, Airtel Money, HaloPesa) - to process payments<br />
          b. Cloud hosting providers - to store and manage data<br />
          c. Email service providers - to send communications<br />
          d. SMS service providers - to send text messages and OTP codes<br />
          e. Analytics providers - to analyze usage patterns<br />
          f. Customer support platforms - to manage support requests<br />
          <em>Example: When you make a payment, we share necessary transaction details with AzamPay or your chosen payment provider to process the payment securely. These providers are contractually obligated to protect your information.</em>
        </p>

        <p>
          <strong>4.2 Business Partners</strong><br />
          We may share limited information with business partners, including;<br />
          a. Property Owners - booking details, guest information, and communication history<br />
          b. Drivers - ride request details, passenger information, and location data<br />
          c. Verified service providers - to facilitate bookings and services<br />
          <em>Example: When you book a property, we share your name, contact information, and booking details with the property owner so they can prepare for your arrival and communicate with you.</em>
        </p>

        <p>
          <strong>4.3 Legal Requirements</strong><br />
          We may disclose your information if required by law or in response to;<br />
          a. Court orders, subpoenas, or legal processes<br />
          b. Government requests or regulatory inquiries<br />
          c. Law enforcement investigations<br />
          d. Protection of rights, property, or safety<br />
          e. Prevention of fraud or illegal activities<br />
          <em>Example: If law enforcement requests information about a user as part of a criminal investigation, we may be legally required to provide that information.</em>
        </p>

        <p>
          <strong>4.4 Business Transfers</strong><br />
          In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity. We will notify you of any such change and ensure the new entity continues to protect your information in accordance with this policy.
        </p>

        <p>
          <strong>4.5 With Your Consent</strong><br />
          We may share your information with third parties when you explicitly consent to such sharing, such as when you choose to connect your account with social media platforms or participate in promotional programs with partners.
        </p>

        <p>
          <strong>5.0 Data Security</strong><br />
          We implement comprehensive security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction;
        </p>

        <p>
          <strong>5.1 Technical Safeguards</strong><br />
          We employ a comprehensive multi-layered approach to technical security, implementing industry-standard measures to protect your personal information at every stage of its lifecycle. Our technical safeguards include the following components;
        </p>

        <p>
          <strong>5.1.1 Data Encryption</strong><br />
          Encryption is fundamental to our security architecture, protecting your data both when it's being transmitted and when it's stored;<br />
          a. <strong>Encryption in Transit:</strong> All data transmitted between your device and our servers is encrypted using Transport Layer Security (TLS) protocols, specifically TLS 1.2 or higher. This ensures that any information you send or receive cannot be intercepted or read by unauthorized parties during transmission. This applies to all interactions, including account login, booking submissions, payment processing, and data retrieval.<br />
          b. <strong>Encryption at Rest:</strong> Sensitive personal information stored in our databases is encrypted using advanced encryption algorithms. This means that even if someone gains unauthorized access to our storage systems, they cannot read your personal data without the encryption keys, which are stored separately and managed under strict access controls.<br />
          <em>Example: When you log into your account, your username and password are encrypted before being sent to our servers. Similarly, when we store your phone number or email address in our database, it's encrypted so that even our system administrators cannot view it in plain text without proper authorization.</em>
        </p>

        <p>
          <strong>5.1.2 Password Security</strong><br />
          We implement robust password protection mechanisms to ensure your account credentials remain secure;<br />
          a. <strong>Hashing and Salting:</strong> Your password is never stored in plain text. Instead, we use cryptographic hashing algorithms combined with unique salt values for each password. This means that even if two users have the same password, they will have different hash values stored in our system. The hashing process is one-way, meaning your original password cannot be recovered from the stored hash.<br />
          b. <strong>Password Requirements:</strong> We enforce strong password policies requiring a combination of letters, numbers, and special characters to reduce the risk of password-based attacks.<br />
          c. <strong>Password Reset Security:</strong> When you request a password reset, we use secure, time-limited tokens sent to your verified email or phone number, ensuring only you can reset your password.<br />
          <em>Example: If your password is "MySecure123!", our system converts it into a complex hash like "a3f8b9c2d1e4f5..." using a unique salt. Even if someone gains access to our database and sees this hash, they cannot determine your original password. This is why we cannot tell you your password if you forget it - we can only help you reset it.</em>
        </p>

        <p>
          <strong>5.1.3 Access Controls and Authentication</strong><br />
          We implement strict access controls to ensure that only authorized individuals and systems can access your personal information;<br />
          a. <strong>Multi-Factor Authentication (MFA):</strong> For sensitive operations and account access, we support multi-factor authentication, requiring additional verification beyond just a password. This may include one-time passwords (OTP) sent via SMS or email, or authenticator app codes.<br />
          b. <strong>Role-Based Access Control (RBAC):</strong> Our system implements role-based access controls, ensuring that employees and systems can only access information necessary for their specific functions. For example, customer support staff can view booking information but cannot access payment card details.<br />
          c. <strong>Session Management:</strong> We use secure session tokens that expire after periods of inactivity. You can view and manage your active sessions through your account settings, allowing you to revoke access from any device.<br />
          d. <strong>API Security:</strong> All API endpoints are protected with authentication tokens and rate limiting to prevent unauthorized access and abuse.<br />
          <em>Example: When you log in, our system creates a secure session token that identifies you for subsequent requests. This token expires if you're inactive for a certain period, requiring you to log in again. You can see all your active sessions in your account settings and sign out from any device remotely.</em>
        </p>

        <p>
          <strong>5.1.4 Network and Infrastructure Security</strong><br />
          Our infrastructure is protected by multiple layers of network security;<br />
          a. <strong>Firewalls:</strong> We deploy advanced firewall systems that monitor and control incoming and outgoing network traffic based on predetermined security rules, blocking potentially malicious connections before they reach our servers.<br />
          b. <strong>Intrusion Detection and Prevention Systems (IDPS):</strong> Our systems continuously monitor for suspicious activities, unauthorized access attempts, and potential security threats. When threats are detected, automated systems can block malicious traffic and alert our security team.<br />
          c. <strong>Distributed Denial of Service (DDoS) Protection:</strong> We employ DDoS mitigation services to protect our platform from attacks that could disrupt service availability.<br />
          d. <strong>Secure Hosting:</strong> Our servers are hosted in secure data centers with physical security measures, redundant power supplies, and environmental controls.<br />
          <em>Example: If our system detects multiple failed login attempts from the same IP address, it automatically blocks further attempts from that source and may require additional verification. This protects your account from brute-force attacks where someone tries to guess your password.</em>
        </p>

        <p>
          <strong>5.1.5 Security Monitoring and Auditing</strong><br />
          We maintain continuous monitoring and regular assessments to identify and address security vulnerabilities;<br />
          a. <strong>Security Audits:</strong> We conduct regular internal and external security audits to identify potential vulnerabilities in our systems, applications, and processes. These audits are performed by qualified security professionals.<br />
          b. <strong>Vulnerability Assessments:</strong> We regularly scan our systems for known security vulnerabilities and apply patches and updates promptly to address any identified issues.<br />
          c. <strong>Security Logging:</strong> We maintain comprehensive logs of system activities, access attempts, and security events. These logs are regularly reviewed to detect anomalies and potential security incidents.<br />
          d. <strong>Penetration Testing:</strong> Periodically, we engage independent security experts to conduct penetration testing, attempting to identify security weaknesses that could be exploited by attackers.<br />
          <em>Example: Our security team regularly reviews access logs to identify unusual patterns, such as login attempts from unfamiliar locations or access to sensitive data outside normal business hours. If suspicious activity is detected, we investigate immediately and may temporarily restrict access while we verify the legitimacy of the activity.</em>
        </p>

        <p>
          <strong>5.1.6 Secure Development Practices</strong><br />
          Security is integrated into every stage of our software development lifecycle;<br />
          a. <strong>Secure Coding Standards:</strong> Our development team follows secure coding practices and guidelines to minimize the introduction of security vulnerabilities during software development.<br />
          b. <strong>Code Reviews:</strong> All code changes undergo security-focused code reviews before being deployed to production systems.<br />
          c. <strong>Dependency Management:</strong> We regularly update and patch third-party libraries and dependencies to address known security vulnerabilities.<br />
          d. <strong>Environment Separation:</strong> We maintain separate development, testing, and production environments, with production data never used in non-production environments.<br />
          <em>Example: Before any new feature is released, our security team reviews the code to ensure it doesn't introduce vulnerabilities. We also regularly update our software dependencies to patch any security issues discovered by the open-source community.</em>
        </p>

        <p>
          <strong>5.2 Organizational Safeguards</strong><br />
          We implement organizational measures to protect your data, including;<br />
          a. Limited access to personal information on a need-to-know basis<br />
          b. Employee training on data protection and privacy<br />
          c. Confidentiality agreements with employees and contractors<br />
          d. Regular review and update of security policies<br />
          <em>Example: Only authorized employees who need to process your booking or provide customer support have access to your personal information. All employees are trained on data protection practices.</em>
        </p>

        <p>
          <strong>5.3 Payment Security</strong><br />
          We take extra precautions to protect payment information. Our platform is designed for one-time payments, which means you will be required to enter your payment details for each transaction;<br />
          a. We do not store full credit card numbers or complete payment details on our servers<br />
          b. Payment processing is handled by secure, certified payment processors<br />
          c. All payment transactions are encrypted during transmission<br />
          d. For local payment methods (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, AzamPay), payment details are entered through secure popup windows provided by the payment provider<br />
          e. We only store transaction references and payment status information necessary for booking confirmation and record-keeping<br />
          <em>Example: When you make a booking, you'll be prompted to enter your payment details through a secure popup window. For local mobile money payments, this popup is provided by your payment service (like M-Pesa or AzamPay). Your payment information is processed securely and we only store the transaction reference number to confirm your payment was successful. For each new booking, you'll enter your payment details again, ensuring maximum security.</em>
        </p>

        <p>
          <strong>5.4 Data Breach Response</strong><br />
          In the unlikely event of a data breach, we will;<br />
          a. Immediately investigate and contain the breach<br />
          b. Notify affected users as soon as possible<br />
          c. Report to relevant authorities as required by law<br />
          d. Take steps to prevent future breaches<br />
          e. Provide guidance on protective measures users can take<br />
        </p>

        <p>
          <strong>6.0 Data Retention</strong><br />
          We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law;
        </p>

        <p>
          <strong>6.1 Account Information</strong><br />
          We retain your account information for as long as your account is active. If you delete your account, we may retain certain information for a limited period to comply with legal obligations, resolve disputes, and enforce our agreements.
        </p>

        <p>
          <strong>6.2 Transaction Records</strong><br />
          We retain booking and payment records for a minimum of seven (7) years to comply with tax and financial regulations, resolve disputes, and provide customer support.
        </p>

        <p>
          <strong>6.3 Communication Records</strong><br />
          We retain customer support communications and messages for up to three (3) years to improve our services and resolve disputes.
        </p>

        <p>
          <strong>6.4 Marketing Data</strong><br />
          If you unsubscribe from marketing communications, we will remove you from our marketing lists but may retain your email address on a suppression list to ensure we don't contact you again.
        </p>

        <p>
          <strong>7.0 Your Rights and Choices</strong><br />
          You have various rights regarding your personal information, which you can exercise at any time;
        </p>

        <p>
          <strong>7.1 Access and Portability</strong><br />
          You have the right to;<br />
          a. Access your personal information<br />
          b. Request a copy of your data in a portable format<br />
          c. Review the information we hold about you<br />
          <em>Example: You can view and download all your account information, booking history, and payment records through your account dashboard.</em>
        </p>

        <p>
          <strong>7.2 Correction and Update</strong><br />
          You have the right to;<br />
          a. Correct inaccurate or incomplete information<br />
          b. Update your profile and account details<br />
          c. Modify your preferences and settings<br />
          <em>Example: If you change your phone number or email address, you can update it in your account settings at any time.</em>
        </p>

        <p>
          <strong>7.3 Deletion</strong><br />
          You have the right to request deletion of your personal information, subject to certain legal and operational requirements. We may retain some information as necessary for legal compliance, dispute resolution, or service provision.
        </p>

        <p>
          <strong>7.4 Opt-Out Rights</strong><br />
          You can opt out of;<br />
          a. Marketing communications (newsletters, promotional emails)<br />
          b. Non-essential cookies and tracking<br />
          c. Location tracking (for Drivers, this may affect service availability)<br />
          <em>Example: You can unsubscribe from our newsletter by clicking the "unsubscribe" link at the bottom of any marketing email, or by updating your preferences in your account settings.</em>
        </p>

        <p>
          <strong>7.5 Account Deactivation</strong><br />
          You can deactivate or delete your account at any time through your account settings. Please note that some information may be retained as required by law or for legitimate business purposes.
        </p>

        <p>
          <strong>7.6 Data Portability</strong><br />
          You can request a copy of your data in a machine-readable format to transfer it to another service provider.
        </p>

        <p>
          <strong>8.0 Children's Privacy</strong><br />
          Our Services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 18, we will take steps to delete that information promptly. If you believe we have collected information from a child, please contact us immediately at <a href="mailto:privacy@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">privacy@nolsaf.com</a>.
        </p>

        <p>
          <strong>9.0 International Data Transfers</strong><br />
          Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. When we transfer your information internationally, we ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
        </p>

        <p>
          <strong>10.0 Third-Party Links and Services</strong><br />
          Our Services may contain links to third-party websites, applications, or services that are not operated by us. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party services you access through our platform.
        </p>

        <p>
          <strong>11.0 Changes to This Privacy Policy</strong><br />
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by;<br />
          a. Posting the updated policy on our website with a new "Last updated" date<br />
          b. Sending an email notification to registered users<br />
          c. Displaying a prominent notice on our platform<br />
          Your continued use of our Services after such changes constitutes your acceptance of the updated policy.
        </p>

        <p>
          <strong>12.0 Contact Us</strong><br />
          If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us;<br />
          <strong>Email:</strong> <a href="mailto:privacy@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">privacy@nolsaf.com</a><br />
          <strong>Support Email:</strong> <a href="mailto:support@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">support@nolsaf.com</a><br />
          <strong>Address:</strong> NoLSAF, East Africa<br />
          We will respond to your inquiries within a reasonable timeframe and in accordance with applicable laws.
        </p>

        <p>
          <strong>13.0 Your Consent</strong><br />
          By using NoLSAF's Services, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, and disclosure of your personal information as described herein. If you do not agree with any part of this policy, please discontinue use of our Services.
        </p>
      </div>
    ),
  },
];
