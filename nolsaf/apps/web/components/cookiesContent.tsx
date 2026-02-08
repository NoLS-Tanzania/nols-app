"use client";

import Link from "@/components/PolicyLink";
import { TermsSection } from "./Terms";

export const COOKIES_LAST_UPDATED = "2025-01-15";

export const COOKIES_SECTIONS: TermsSection[] = [
  {
    title: "Overview",
    content: (
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            NoLSAF uses cookies and similar technologies to enhance your experience on our platform. Cookies are small text files stored on your device that help us remember your preferences, keep you logged in, and improve our services. We use essential cookies that are necessary for the platform to function, analytics cookies to understand how you use our site, and preference cookies to remember your settings. You can control cookies through your browser settings, though disabling certain cookies may affect platform functionality. We also use local storage to remember your login status, theme preferences, and other settings. By using NoLSAF, you consent to our use of cookies as described in this policy.
          </p>
        </div>

        <p>
          <strong>1.0 Introduction</strong><br />
          This Cookies Policy explains how NoLSAF (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) uses cookies and similar tracking technologies when you visit or use our website, mobile applications, and related services (collectively, the &quot;Services&quot;). This policy should be read in conjunction with our <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</Link>, which provides additional information about how we collect, use, and protect your personal information.
        </p>

        <p>
          <strong>1.1 What Are Cookies</strong><br />
          Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners. Cookies allow a website to recognize your device and store some information about your preferences or past actions.<br />
          <em>Example: When you log into NoLSAF, we set a cookie that remembers you&apos;re logged in. This means you don&apos;t have to enter your password every time you visit a new page on our platform during the same session.</em>
        </p>

        <p>
          <strong>1.2 Types of Technologies We Use</strong><br />
          In addition to cookies, we use similar technologies including;<br />
          a. <strong>Local Storage:</strong> A browser feature that allows websites to store data locally on your device. We use this to remember your preferences and login status.<br />
          b. <strong>Session Storage:</strong> Similar to local storage but data is cleared when you close your browser tab.<br />
          c. <strong>Web Beacons/Pixels:</strong> Small invisible images that help us understand how you interact with our emails and website.<br />
          <em>Example: We use local storage to remember your theme preference (light or dark mode) and language selection, so these settings persist even after you close your browser and return later.</em>
        </p>

        <p>
          <strong>2.0 Types of Cookies We Use</strong><br />
          We use different types of cookies for various purposes, which are categorized as follows;
        </p>

        <p>
          <strong>2.1 Essential Cookies</strong><br />
          These cookies are strictly necessary for the platform to function and cannot be disabled. They are essential for you to navigate the website and use its features;<br />
          a. <strong>Authentication Cookies:</strong> These cookies enable you to log in and remain logged in to your account. They store your authentication token securely so you don&apos;t have to re-enter your credentials on every page.<br />
          b. <strong>Session Management Cookies:</strong> These cookies maintain your session state as you navigate through our platform, ensuring that your actions are properly tracked and your data is associated with the correct session.<br />
          c. <strong>Security Cookies:</strong> These cookies help protect against security threats, including cross-site request forgery (CSRF) attacks and unauthorized access attempts.<br />
          d. <strong>Load Balancing Cookies:</strong> These cookies help distribute website traffic across multiple servers to ensure optimal performance and availability.<br />
          <em>Example: When you add items to your booking cart, essential cookies remember what you&apos;ve selected so that when you proceed to checkout, your selections are still there. Without these cookies, you would lose your cart contents every time you navigate to a new page.</em>
        </p>

        <p>
          <strong>2.2 Functional Cookies</strong><br />
          These cookies enhance the functionality and personalization of our Services. While not strictly necessary, they provide features that improve your experience;<br />
          a. <strong>Preference Cookies:</strong> These cookies remember your preferences and settings, such as your preferred language, theme (light/dark mode), currency, and region settings.<br />
          b. <strong>User Interface Cookies:</strong> These cookies remember your interface preferences, such as widget visibility, dashboard layout, and display options.<br />
          c. <strong>Location Cookies:</strong> These cookies remember your location preferences to provide relevant property listings and services in your area.<br />
          <em>Example: If you prefer to view properties in Tanzanian Shillings (TZS) and select dark mode, functional cookies remember these choices so you don&apos;t have to set them again on your next visit.</em>
        </p>

        <p>
          <strong>2.3 Analytics and Performance Cookies</strong><br />
          These cookies help us understand how visitors interact with our platform by collecting and reporting information anonymously;<br />
          a. <strong>Usage Analytics:</strong> These cookies collect information about how you use our website, such as which pages you visit most often, how long you spend on pages, and any error messages you encounter. This information helps us improve the design and functionality of our platform.<br />
          b. <strong>Performance Monitoring:</strong> These cookies help us monitor the performance of our Services, identifying slow-loading pages, errors, and areas that need optimization.<br />
          c. <strong>Feature Usage:</strong> These cookies track which features are most popular and which are rarely used, helping us prioritize development efforts.<br />
          <em>Example: Analytics cookies tell us that many users search for properties near beaches, which helps us improve our search filters and suggest relevant properties. This data is aggregated and anonymized, so we don&apos;t know it&apos;s specifically you searching for beach properties.</em>
        </p>

        <p>
          <strong>2.4 Marketing and Advertising Cookies</strong><br />
          These cookies are used to deliver relevant advertisements and track the effectiveness of our marketing campaigns. We may use these cookies to;<br />
          a. Remember that you have visited our website, which helps us show you relevant advertisements on other websites<br />
          b. Limit the number of times you see an advertisement<br />
          c. Measure the effectiveness of advertising campaigns<br />
          d. Provide you with personalized content based on your interests and browsing behavior<br />
          <em>Example: If you&apos;ve been browsing beach properties on NoLSAF, marketing cookies might help show you advertisements for beach-related travel services when you visit other websites. You can opt out of these cookies through your browser settings or our cookie preferences.</em>
        </p>

        <p>
          <strong>3.0 Specific Cookies and Technologies We Use</strong><br />
          Below is a detailed list of the specific cookies and technologies we use on our platform;
        </p>

        <p>
          <strong>3.1 Authentication and Session Cookies</strong><br />
          a. <strong>token:</strong> Stores your authentication token to keep you logged in. This cookie is essential for accessing your account and is encrypted for security.<br />
          b. <strong>role:</strong> Remembers your user role (User, Owner, Driver, or Admin) to provide you with the appropriate interface and features.<br />
          c. <strong>sessionId:</strong> Maintains your active session and helps prevent unauthorized access to your account.<br />
          <em>Example: The &quot;token&quot; cookie contains an encrypted authentication token that proves you&#39;re logged in. When you visit a page that requires authentication, our system checks this cookie instead of asking for your password again.</em>
        </p>

        <p>
          <strong>3.2 Local Storage Usage</strong><br />
          We use browser local storage (localStorage) to store various preferences and data;<br />
          a. <strong>User Preferences:</strong> Theme selection (light/dark mode), language preferences, and display settings<br />
          b. <strong>Policy Acceptances:</strong> Records of which policies you&#39;ve accepted (Terms, Privacy, Cookies) to avoid showing consent prompts repeatedly<br />
          c. <strong>Widget Settings:</strong> Dashboard widget visibility and layout preferences for authenticated users<br />
          d. <strong>Navigation Context:</strong> Remembers whether you&#39;re browsing from a public or authenticated context to show appropriate headers and footers<br />
          e. <strong>Form Data:</strong> Temporarily stores form data to prevent loss if you accidentally close your browser<br />
          <em>Example: When you accept our Privacy Policy, we store &quot;privacyAccepted: true&quot; in local storage. This way, we don&#39;t show you the acceptance prompt every time you visit, but you can still access the policy anytime.</em>
        </p>

        <p>
          <strong>3.3 Session Storage Usage</strong><br />
          We use session storage for temporary data that should be cleared when you close your browser;<br />
          a. <strong>Navigation Context:</strong> Tracks whether you navigated from a public or authenticated area to show appropriate page layouts<br />
          b. <strong>Temporary Form State:</strong> Stores form data temporarily during multi-step processes<br />
          c. <strong>Search Filters:</strong> Remembers your search criteria during your current browsing session<br />
          <em>Example: If you click a policy link from the public footer, session storage remembers this context so the policy page shows the public header and footer, even if you&#39;re logged in.</em>
        </p>

        <p>
          <strong>4.0 Third-Party Cookies</strong><br />
          Some cookies on our platform are set by third-party services that we use to enhance functionality;
        </p>

        <p>
          <strong>4.1 Payment Processors</strong><br />
          When you make a payment, our payment processors (such as AzamPay, Stripe, M-Pesa gateways) may set cookies to facilitate the payment process and ensure transaction security. These cookies are subject to the privacy policies of the respective payment providers.
        </p>

        <p>
          <strong>4.2 Analytics Services</strong><br />
          We may use third-party analytics services that set cookies to help us understand how our platform is used. These services collect aggregated, anonymized data about website usage patterns.
        </p>

        <p>
          <strong>4.3 Social Media and Content</strong><br />
          If you interact with social media features or embedded content on our platform, those third-party services may set their own cookies. We do not control these cookies, and their use is governed by the respective third-party privacy policies.
        </p>

        <p>
          <strong>5.0 How Long Cookies Are Stored</strong><br />
          Different cookies have different lifespans, depending on their purpose;
        </p>

        <p>
          <strong>5.1 Session Cookies</strong><br />
          These cookies are temporary and are deleted when you close your browser. They are used to maintain your session while you&apos;re actively using our platform.
        </p>

        <p>
          <strong>5.2 Persistent Cookies</strong><br />
          These cookies remain on your device for a set period or until you delete them. They include;<br />
          a. <strong>Authentication Cookies:</strong> Typically expire after a period of inactivity (e.g., 30 days) or when you explicitly log out<br />
          b. <strong>Preference Cookies:</strong> May remain on your device for up to one year or until you change your preferences<br />
          c. <strong>Analytics Cookies:</strong> Usually expire after 1-2 years<br />
          <em>Example: Your authentication cookie might be set to expire after 30 days of inactivity. If you log in every day, it keeps refreshing. But if you don&#39;t visit for 30 days, the cookie expires and you&#39;ll need to log in again for security.</em>
        </p>

        <p>
          <strong>6.0 Your Cookie Choices and Controls</strong><br />
          You have several options for managing cookies and similar technologies;
        </p>

        <p>
          <strong>6.1 Browser Settings</strong><br />
          Most web browsers allow you to control cookies through their settings. You can;<br />
          a. View what cookies are stored on your device<br />
          b. Delete existing cookies<br />
          c. Block cookies from specific websites<br />
          d. Block all cookies (though this may significantly impact website functionality)<br />
          e. Set your browser to notify you when cookies are being set<br />
          <em>Example: In Chrome, you can go to Settings → Privacy and Security → Cookies and other site data to manage cookie preferences. You can block all cookies, block third-party cookies, or allow cookies only from sites you visit.</em>
        </p>

        <p>
          <strong>6.2 Platform Cookie Preferences</strong><br />
          We provide options within our platform to manage certain cookie preferences, particularly for non-essential cookies such as analytics and marketing cookies. You can access these preferences through your account settings.
        </p>

        <p>
          <strong>6.3 Opt-Out Tools</strong><br />
          For certain types of cookies, particularly advertising cookies, you can use industry opt-out tools;<br />
          a. Digital Advertising Alliance (DAA) opt-out page<br />
          b. Network Advertising Initiative (NAI) opt-out page<br />
          c. Your device&apos;s advertising ID settings (for mobile devices)<br />
        </p>

        <p>
          <strong>6.4 Impact of Disabling Cookies</strong><br />
          Please note that disabling certain cookies may impact your experience on our platform;<br />
          a. <strong>Essential Cookies:</strong> If you disable essential cookies, you may not be able to log in, make bookings, or use core features of our platform<br />
          b. <strong>Functional Cookies:</strong> Disabling functional cookies means you&#39;ll need to reset your preferences (language, theme, etc.) each time you visit<br />
          c. <strong>Analytics Cookies:</strong> Disabling analytics cookies won&#39;t affect functionality but prevents us from improving the platform based on usage data<br />
          <em>Example: If you block all cookies, you won&#39;t be able to stay logged in to your account. Every time you navigate to a new page, you&#39;d need to log in again. Your shopping cart wouldn&#39;t remember items you&#39;ve added, and your preferences wouldn&#39;t be saved.</em>
        </p>

        <p>
          <strong>7.0 Mobile Applications</strong><br />
          If you use our mobile applications, we may use similar technologies to cookies, such as;<br />
          a. <strong>Device Identifiers:</strong> Unique identifiers associated with your mobile device<br />
          b. <strong>Application Data Storage:</strong> Local storage within the app to remember preferences and cache data<br />
          c. <strong>Push Notification Tokens:</strong> Tokens that allow us to send you push notifications (with your consent)<br />
          <em>Example: Our mobile app stores your login credentials securely on your device so you don&apos;t have to log in every time you open the app. This is similar to how cookies work on websites.</em>
        </p>

        <p>
          <strong>8.0 Updates to This Cookies Policy</strong><br />
          We may update this Cookies Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make significant changes, we will;<br />
          a. Update the &quot;Last updated&quot; date at the top of this policy<br />
          b. Notify you through our platform or via email<br />
          c. Provide a summary of the key changes<br />
          Your continued use of our Services after such updates constitutes your acceptance of the revised policy.
        </p>

        <p>
          <strong>9.0 Contact Us</strong><br />
          If you have questions about our use of cookies or this Cookies Policy, please contact us;<br />
          <strong>Email:</strong> <a href="mailto:privacy@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">privacy@nolsaf.com</a><br />
          <strong>Support Email:</strong> <a href="mailto:support@nolsaf.com" className="text-blue-600 hover:text-blue-800 underline">support@nolsaf.com</a><br />
          We will respond to your inquiries within a reasonable timeframe.
        </p>

        <p>
          <strong>10.0 Your Consent</strong><br />
          By using NoLSAF&apos;s Services, you consent to our use of cookies and similar technologies as described in this Cookies Policy. If you do not agree with our use of cookies, you can adjust your browser settings or discontinue use of our Services. However, please note that some features may not function properly if you disable essential cookies.
        </p>
      </div>
    ),
  },
];
