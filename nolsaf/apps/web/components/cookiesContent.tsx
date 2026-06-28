"use client";

import Link from "@/components/PolicyLink";
import { TermsSection } from "./Terms";

export const COOKIES_LAST_UPDATED = "28 June 2026";

export const COOKIES_SECTIONS: TermsSection[] = [
  {
    title: "Overview",
    content: (
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            NoLSAF uses cookies and similar technologies to keep you signed in, secure your account, remember preferences, manage booking and payment flows, and improve our services. We use essential cookies that are necessary for the platform to function, local storage for consent and app preferences, session storage for temporary navigation and form context, and secure mobile storage for app authentication tokens. You can control cookies through your browser settings and our cookie preferences, though disabling essential cookies may affect login, booking, payment, and account features.
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
          a. <strong>Local Storage:</strong> A browser feature that allows websites to store data locally on your device. We use this to remember cookie consent, preferences, app context, draft form data, and web app authentication tokens where applicable.<br />
          b. <strong>Session Storage:</strong> Similar to local storage but data is cleared when you close your browser tab. We use it for temporary navigation context, filters, payment return state, and form steps.<br />
          c. <strong>Mobile Secure Storage:</strong> In our mobile apps, authentication tokens may be stored in secure device storage provided by the operating system.<br />
          d. <strong>Web Beacons/Pixels:</strong> Small invisible images that may help us understand how you interact with emails and website content if enabled.<br />
          <em>Example: We use local storage to remember your cookie preferences and may use secure mobile storage to keep you signed in to the NoLSAF mobile app.</em>
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
          <em>Example: If analytics tools are enabled, analytics cookies can tell us that many users search for properties near beaches, which helps us improve our search filters and suggest relevant properties. This data is generally aggregated and used to improve the platform.</em>
        </p>

        <p>
          <strong>2.4 Marketing and Advertising Cookies</strong><br />
          Where enabled, these cookies may be used to deliver relevant advertisements and track the effectiveness of marketing campaigns. We may use these cookies to;<br />
          a. Remember that you have visited our website, which helps us show you relevant advertisements on other websites<br />
          b. Limit the number of times you see an advertisement<br />
          c. Measure the effectiveness of advertising campaigns<br />
          d. Provide you with personalized content based on your interests and browsing behavior<br />
          <em>Example: If marketing cookies are enabled and you have been browsing beach properties on NoLSAF, they may help show relevant travel content or measure campaign performance. You can opt out through browser settings or our cookie preferences.</em>
        </p>

        <p>
          <strong>3.0 Specific Cookies and Technologies We Use</strong><br />
          Below is a detailed list of the specific cookies and technologies we use on our platform;
        </p>

        <p>
          <strong>3.1 Authentication and Session Cookies</strong><br />
          a. <strong>nolsaf_token:</strong> Stores your secure authentication token to keep you signed in and authorize account actions.<br />
          b. <strong>token:</strong> A compatibility authentication cookie used by parts of the platform to verify your logged-in session.<br />
          c. <strong>role:</strong> Stores your user role (Customer, Owner, Driver, Agent, or Admin) so the app can route you to the correct interface and protect role-specific pages.<br />
          d. <strong>CSRF/security tokens:</strong> May be issued to help protect forms and API requests from unauthorized cross-site actions.<br />
          <em>Example: The &quot;nolsaf_token&quot; and &quot;token&quot; cookies prove that you are signed in. The &quot;role&quot; cookie helps the app send you to the correct dashboard.</em>
        </p>

        <p>
          <strong>3.2 Local Storage Usage</strong><br />
          We use browser local storage (localStorage) to store various preferences and data;<br />
          a. <strong>Cookie Consent:</strong> The key <strong>nolsaf_cookie_consent</strong> stores whether you accepted, rejected, or customized analytics and marketing preferences.<br />
          b. <strong>User Preferences:</strong> Theme selection, language preferences, currency preferences, map preferences, display settings, and dashboard preferences where available.<br />
          c. <strong>Authentication Tokens on Web Apps:</strong> Some NoLSAF web/mobile-web experiences may store authentication tokens such as <strong>nolsaf.mobile.authToken</strong> or <strong>nolsaf.driver.authToken</strong> in local storage when running on the web.<br />
          d. <strong>Navigation and Payment Context:</strong> Public/authenticated browsing context, last action context, payment return state, filters, and temporary page state.<br />
          e. <strong>Drafts and Form Data:</strong> Temporary or draft data for multi-step flows such as property onboarding, booking, group stay, or tour flows so accidental navigation does not immediately lose progress.<br />
          <em>Example: When you choose cookie preferences, we store the choice in &quot;nolsaf_cookie_consent&quot; so we do not ask you again on every page.</em>
        </p>

        <p>
          <strong>3.3 Session Storage Usage</strong><br />
          We use session storage for temporary data that should be cleared when you close your browser;<br />
          a. <strong>Navigation Context:</strong> Tracks whether you navigated from a public or authenticated area to show appropriate page layouts<br />
          b. <strong>Temporary Form State:</strong> Stores form data temporarily during multi-step processes<br />
          c. <strong>Search Filters:</strong> Remembers your search criteria during your current browsing session<br />
          d. <strong>Payment and Receipt Context:</strong> Temporarily stores payment return state, invoice send state, or receipt context needed to complete a flow<br />
          <em>Example: If you click a policy link from the public footer, session storage remembers this context so the policy page shows the public header and footer, even if you&#39;re logged in.</em>
        </p>

        <p>
          <strong>3.4 Mobile App Storage</strong><br />
          Our native mobile apps may store authentication tokens in secure device storage, such as Expo SecureStore or the operating system keychain/keystore. These tokens keep you signed in and authorize API requests. If the app is used on web, a similar token may be stored in local storage instead.<br />
          <em>Example: The customer app may store a token under &quot;nolsaf.mobile.authToken&quot; and the driver app may store a token under &quot;nolsaf.driver.authToken&quot; so the app can securely authenticate requests.</em>
        </p>

        <p>
          <strong>4.0 Third-Party Cookies</strong><br />
          Some cookies on our platform are set by third-party services that we use to enhance functionality;
        </p>

        <p>
          <strong>4.1 Payment Processors</strong><br />
          When you make a payment, our payment processors (such as AzamPay, mobile money, bank, and card payment providers) may set cookies or use browser/session storage to facilitate checkout, redirect you back to NoLSAF, prevent duplicate payments, and ensure transaction security. These technologies are subject to the privacy policies of the respective payment providers.
        </p>

        <p>
          <strong>4.2 Analytics Services</strong><br />
          We may use third-party analytics services that set cookies to help us understand how our platform is used. These services collect usage, device, and performance data that we use to improve the platform. Where consent is required, we use analytics cookies according to your cookie preferences.
        </p>

        <p>
          <strong>4.3 Social Media and Content</strong><br />
          If you interact with social media features, embedded content, or embedded video content on our platform, those third-party services may set their own cookies. We do not control these cookies, and their use is governed by the respective third-party privacy policies.
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
          a. <strong>Authentication Cookies:</strong> Expire according to the applicable session policy for your role or when you explicitly log out<br />
          b. <strong>Cookie Consent and Preferences:</strong> May remain on your device until you clear site data, reset preferences, or we ask for renewed consent<br />
          c. <strong>Preference Cookies and Local Storage:</strong> May remain on your device until you change preferences, clear site data, or uninstall the app<br />
          d. <strong>Analytics or Marketing Cookies:</strong> Where enabled, these usually expire based on the provider's configured retention period<br />
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
          We provide options within our platform to manage certain cookie preferences, particularly for non-essential cookies such as analytics and marketing cookies. The cookie banner allows you to accept, reject, or customize analytics and marketing preferences. Essential cookies remain active because they are required for login, security, booking, payment, and account features.
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
          a. <strong>Device Identifiers:</strong> Unique identifiers associated with your mobile device where required for security, diagnostics, or app functionality<br />
          b. <strong>Application Data Storage:</strong> Secure storage or local app storage used to remember authentication tokens, preferences, cached content, and draft state<br />
          c. <strong>Push Notification Tokens:</strong> Tokens that allow us to send you push notifications where enabled and supported<br />
          <em>Example: Our mobile app stores your authentication token securely on your device so you do not have to log in every time you open the app.</em>
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
