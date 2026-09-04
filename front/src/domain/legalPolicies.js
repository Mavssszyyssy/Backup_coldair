export const LEGAL_LAST_UPDATED = "September 4, 2026";

export const LEGAL_POLICIES = {
  warranty: {
    id: "warranty",
    path: "/terms/warranty",
    shortTitle: "Warranty Terms",
    title: "Warranty Terms and Conditions",
    category: "Product protection",
    summary:
      "These terms explain when warranty coverage starts, what may be covered, and how customers can request warranty support for a registered AC unit.",
    notice:
      "A “Pending activation” status does not require the customer to approve the warranty. It means Cold Air ACT is still verifying the unit, serial number, or completed installation record.",
    sections: [
      {
        id: "scope",
        title: "1. Scope of these warranty terms",
        paragraphs: [
          "These Warranty Terms apply to air-conditioning units sold or installed by Cold Air ACT and registered in the AeroPulse system. They explain how Cold Air ACT administers warranty records and support requests.",
          "The manufacturer’s written warranty for the specific brand and model remains the controlling product warranty. The coverage period, covered parts, exclusions, and available remedy shown in the customer’s registered AC unit record or accompanying warranty document apply to that unit.",
        ],
      },
      {
        id: "activation",
        title: "2. Activation and coverage period",
        paragraphs: [
          "A warranty record is created from the completed order-to-installation process. Activation may require confirmation of the product model, serial number, purchase record, installation date, and technician completion report.",
          "When the status is Pending activation, Cold Air ACT is reviewing or completing those records. No customer acceptance is required unless the support team asks for missing proof or corrected information. Once verified, the system will display the coverage start date, expiry date, and applicable coverage details.",
          "A missing or pending digital record does not remove any mandatory consumer right that applies under Philippine law or a valid written manufacturer warranty.",
        ],
      },
      {
        id: "coverage",
        title: "3. What may be covered",
        paragraphs: [
          "Coverage depends on the warranty issued for the purchased model. The registered unit record may identify covered components, coverage dates, and limitations.",
        ],
        bullets: [
          "Manufacturing defects in covered parts or components.",
          "Repair or replacement remedies stated in the applicable manufacturer warranty.",
          "Installation workmanship only when it is expressly included in the Cold Air ACT service or installation warranty.",
        ],
      },
      {
        id: "exclusions",
        title: "4. Common exclusions and limitations",
        paragraphs: [
          "Subject to applicable law and the written warranty for the unit, coverage may be declined when the reported issue results from a condition outside the warranty’s scope.",
        ],
        bullets: [
          "Misuse, neglect, accidental or cosmetic damage, pests, fire, flooding, voltage irregularities, or other external causes.",
          "Unauthorized modification, dismantling, relocation, repair, or use of non-approved parts that caused or contributed to the failure.",
          "Normal cleaning, maintenance, consumable items, and ordinary wear unless the written warranty expressly includes them.",
          "Incorrect information, an altered serial number, or inability to reasonably verify the unit and purchase or installation record.",
        ],
      },
      {
        id: "request-support",
        title: "5. How to request warranty support",
        paragraphs: [
          "Warranty requests are submitted only through the Cold Air ACT mobile app. Sign in using the same account connected to the registered AC unit, open My Units or Services, select the unit, and choose Warranty Support.",
          "Describe the issue accurately and attach the requested photos or supporting records. Submission creates a request for review; it is not an automatic approval of coverage.",
        ],
      },
      {
        id: "assessment",
        title: "6. Assessment and remedy",
        paragraphs: [
          "Cold Air ACT or the manufacturer may inspect the unit, confirm the serial and service history, diagnose the reported issue, and determine whether it falls within the applicable warranty. The customer will be informed if a site visit, part order, manufacturer authorization, quotation, or other action is needed.",
          "An approved remedy may be repair, replacement of a covered component, or another remedy required by the written warranty or applicable law. Timing depends on diagnosis, site access, parts availability, and manufacturer authorization.",
        ],
      },
      {
        id: "customer-duties",
        title: "7. Customer responsibilities",
        bullets: [
          "Keep account, address, contact, unit, and service information accurate.",
          "Provide safe and reasonable access to the unit for an authorized inspection or repair.",
          "Follow operating and maintenance instructions supplied with the unit.",
          "Keep receipts, service records, and other proof requested for claim verification.",
        ],
      },
      {
        id: "consumer-rights",
        title: "8. Consumer rights",
        paragraphs: [
          "These terms do not exclude or reduce rights and remedies that cannot lawfully be waived under the Consumer Act of the Philippines and other applicable laws. If a manufacturer warranty provides more favorable coverage, that written warranty applies to the extent of the additional benefit.",
        ],
      },
      {
        id: "contact",
        title: "9. Questions and disputes",
        paragraphs: [
          "For warranty-record corrections or help submitting a request, contact Cold Air ACT through Customer Support. Include the order number, model, and serial number when available so the correct branch can assist you.",
        ],
      },
    ],
  },

  service: {
    id: "service",
    path: "/terms/service",
    shortTitle: "Service Terms",
    title: "Service Terms and Conditions",
    category: "Installation and field service",
    summary:
      "These terms apply to installation, maintenance, cleaning, inspection, repair, and warranty-related field services handled by Cold Air ACT.",
    notice:
      "All service types are booked and managed only in the Cold Air ACT mobile app. The website may show unit, order, and service information but does not create a service request.",
    sections: [
      {
        id: "scope",
        title: "1. Services covered",
        paragraphs: [
          "These Service Terms apply to installation, preventive maintenance, cleaning, inspection, repair, diagnostic, and warranty-support visits requested from Cold Air ACT. The exact work, price, assigned branch, and schedule depend on the selected service and the confirmed work order.",
        ],
      },
      {
        id: "booking",
        title: "2. Booking and confirmation",
        paragraphs: [
          "Customers must submit service requests through the mobile app using the account connected to the relevant AC unit. A preferred date is a request only. An appointment becomes confirmed after Cold Air ACT accepts the request and assigns or schedules the work.",
          "The customer must provide an accurate concern, service address, contact details, unit information, room or installation details when requested, and any access instructions needed by the assigned team.",
        ],
      },
      {
        id: "pricing",
        title: "3. Estimates, additional work, and payment",
        paragraphs: [
          "Prices displayed before inspection are estimates unless expressly identified as fixed. If diagnosis reveals additional labor, parts, materials, access equipment, or corrective work, Cold Air ACT will provide the applicable details or quotation before proceeding when customer approval is required.",
          "Available payment methods and payment status are shown in the order or service record. The customer must use an authorized payment channel and keep proof of payment where applicable.",
        ],
      },
      {
        id: "site-access",
        title: "4. Site access and safety",
        bullets: [
          "An authorized adult must be present when required for site access and approval of work.",
          "The work area must be reasonably accessible and free from avoidable hazards.",
          "Customers must disclose known electrical, structural, access, building, or safety restrictions before the visit.",
          "A technician may pause or reschedule work when conditions are unsafe, required permission is unavailable, or the requested work falls outside the confirmed scope.",
        ],
      },
      {
        id: "check-in",
        title: "5. Technician location check-in",
        paragraphs: [
          "For operational visibility and safety, an assigned technician may check in at the service location. The resulting check-in status or location record may be visible to the customer and authorized branch or administrative personnel.",
          "A check-in confirms a work-stage event; it is not a promise of continuous live tracking and must not be used to contact, follow, or interfere with the technician outside the official work order.",
        ],
      },
      {
        id: "rescheduling",
        title: "6. Rescheduling, cancellation, and failed visits",
        paragraphs: [
          "Customers should request changes as early as possible through the available support or mobile service workflow. Cold Air ACT may reschedule for technician availability, weather, unsafe conditions, access restrictions, unavailable parts, emergencies, or events beyond reasonable control.",
          "A repeat-visit or cancellation charge may apply only when disclosed and applicable to the confirmed service, such as when access is unavailable after dispatch or work has already begun.",
        ],
      },
      {
        id: "completion",
        title: "7. Completion and service records",
        paragraphs: [
          "The technician records the work performed, relevant findings, used parts or serial information, photos when required, and completion status. Customers should review the completion details and promptly report an inaccurate record or unresolved concern through Customer Support.",
        ],
      },
      {
        id: "warranty-work",
        title: "8. Warranty-related service",
        paragraphs: [
          "Selecting Warranty Support does not itself confirm that the work is covered. Eligibility is assessed under the applicable Warranty Terms and the unit’s registered warranty record. Non-covered work will be explained and quoted when applicable before chargeable work proceeds.",
        ],
      },
      {
        id: "liability",
        title: "9. Responsibility and limitations",
        paragraphs: [
          "Each party is responsible for loss or damage caused by its own negligence, unlawful conduct, or breach of these terms. Nothing in these Service Terms limits a liability or consumer remedy that cannot legally be excluded.",
        ],
      },
      {
        id: "support",
        title: "10. Service concerns",
        paragraphs: [
          "Raise service-record, scheduling, conduct, or workmanship concerns through Customer Support so the request can be routed to the assigned branch and reviewed by authorized administrators.",
        ],
      },
    ],
  },

  app: {
    id: "app",
    path: "/terms/app",
    shortTitle: "App Terms",
    title: "App Terms and Conditions",
    category: "Website and mobile application",
    summary:
      "These terms govern access to the Cold Air ACT website, mobile app, AeroPulse features, customer accounts, orders, and digital service records.",
    notice:
      "By creating an account or continuing to use the website or mobile app, you agree to these App Terms and the separate policies that apply to purchases, services, warranties, and personal data.",
    sections: [
      {
        id: "agreement",
        title: "1. Agreement and related policies",
        paragraphs: [
          "These App Terms form an agreement between the user and Cold Air ACT for use of the website, mobile application, and AeroPulse-enabled features. The Warranty Terms, Service Terms, Privacy Notice, checkout disclosures, and confirmed order or work-order details form part of the applicable transaction.",
          "If a transaction-specific term conflicts with these general App Terms, the more specific term controls for that transaction, subject to applicable law.",
        ],
      },
      {
        id: "eligibility",
        title: "2. Eligibility and customer accounts",
        paragraphs: [
          "You must provide accurate information and have legal capacity to enter the transaction. A minor may use the service only through a parent or legal guardian who accepts responsibility for the account and transaction.",
          "Public registration creates customer accounts only. Staff and technician accounts are issued through authorized administrative processes and must not be shared or represented as customer accounts.",
        ],
      },
      {
        id: "security",
        title: "3. Account and authentication security",
        bullets: [
          "Keep your password, verification codes, authenticator codes, and recovery information confidential.",
          "Use only your own contact information and authenticator unless you are legally authorized to act for another person.",
          "Notify Customer Support promptly if you suspect unauthorized access.",
          "You are responsible for activity performed through your account until Cold Air ACT receives and can reasonably act on a security report, except where the law provides otherwise.",
        ],
      },
      {
        id: "catalog-orders",
        title: "4. Catalog, stock, and orders",
        paragraphs: [
          "Product descriptions, horsepower, pricing, images, and available stock are provided to support purchase decisions. Cold Air ACT may correct a clear error before confirming fulfillment and will inform the customer when the correction materially affects the order.",
          "Adding an item to the cart does not reserve stock. An order is subject to confirmation, valid payment or payment method, stock allocation, delivery coverage, and other checkout requirements. For Cash on Delivery orders, stock is committed or deducted according to the confirmed dispatch workflow rather than merely when the order is placed.",
        ],
      },
      {
        id: "payments",
        title: "5. Payments and refunds",
        paragraphs: [
          "Only payment methods displayed at checkout are available for the transaction. Payment processing may be provided by an authorized third party under its own terms. Do not send payment credentials through chat, support messages, or technician notes.",
          "Cancellations, returns, refunds, or adjustments depend on the order status, product condition, applicable transaction terms, and mandatory consumer rights.",
        ],
      },
      {
        id: "acceptable-use",
        title: "6. Acceptable use",
        bullets: [
          "Do not access another person’s account, staff tools, unit record, order, QR code, or service request without authorization.",
          "Do not submit false orders, claims, locations, photos, serial numbers, payments, or service records.",
          "Do not interfere with security, availability, source code, network traffic, or role-based access controls.",
          "Do not harass customers, staff, or technicians or use contact and location information outside its intended service purpose.",
        ],
      },
      {
        id: "amp",
        title: "7. AeroPulse and AI-assisted features",
        paragraphs: [
          "AeroPulse may provide forecasts, maintenance recommendations, summaries, or other decision-support outputs using available unit, environment, usage, order, and service data. These outputs are recommendations and may be incomplete or inaccurate; they do not replace an on-site diagnosis, manufacturer instruction, safety requirement, or authorized human decision.",
          "When an AI-assisted feature is enabled, the interface will identify its purpose and the relevant Privacy Notice will govern the personal data used. Cold Air ACT will not treat an AI recommendation alone as final approval or denial of a warranty claim or other decision with legal effect without an appropriate lawful basis and human review.",
        ],
      },
      {
        id: "availability",
        title: "8. Availability and third-party services",
        paragraphs: [
          "The service may occasionally be unavailable for maintenance, security, network, provider, or operational reasons. Email delivery, OTP, maps, payment, hosting, and other integrated functions may be supplied by third-party providers and may also be subject to their terms and availability.",
        ],
      },
      {
        id: "ownership",
        title: "9. Ownership and permitted access",
        paragraphs: [
          "Cold Air ACT and its licensors retain rights in the application, design, software, content, trademarks, and system materials, excluding customer-provided content and third-party materials. You receive a limited, revocable, non-transferable right to use the service for its intended personal or authorized business purpose.",
        ],
      },
      {
        id: "suspension",
        title: "10. Suspension and termination",
        paragraphs: [
          "Cold Air ACT may restrict or suspend access when reasonably necessary to protect users, investigate fraud or abuse, enforce role permissions, comply with law, or address a material breach. Where appropriate, the user will be informed and may contact Customer Support to dispute or correct the issue.",
        ],
      },
      {
        id: "law-changes",
        title: "11. Applicable law and changes",
        paragraphs: [
          "These terms are governed by the laws of the Republic of the Philippines. Mandatory consumer and privacy rights remain unaffected. Material updates will be posted with a revised effective date, and renewed acceptance may be requested when appropriate.",
        ],
      },
      {
        id: "contact",
        title: "12. Contact",
        paragraphs: [
          "Questions about these App Terms may be submitted through Cold Air ACT Customer Support. Transaction concerns should include the relevant account email, order number, unit serial number, or service request number when available.",
        ],
      },
    ],
  },

  privacy: {
    id: "privacy",
    path: "/privacy",
    shortTitle: "Privacy Notice",
    title: "Data Privacy Notice",
    category: "Republic Act No. 10173",
    summary:
      "This notice explains how Cold Air ACT collects, uses, shares, protects, and retains personal data across the website, mobile app, orders, warranty records, and field-service workflows.",
    notice:
      "Cold Air ACT processes personal data in line with the principles of transparency, legitimate purpose, and proportionality under the Philippine Data Privacy Act of 2012.",
    sections: [
      {
        id: "controller",
        title: "1. Personal information controller",
        paragraphs: [
          "Cold Air ACT is the personal information controller for customer and operational information processed through this system. Its main branch is in Plaridel, Bulacan, with configured service branches across Luzon.",
          "Privacy questions and requests may be sent to coldairairconditioning@yahoo.com or raised through Customer Support. Please do not include passwords, OTPs, or authenticator codes in a request.",
        ],
      },
      {
        id: "data-collected",
        title: "2. Personal data we may collect",
        bullets: [
          "Identity and account data, such as name, email address, mobile number, alias, role, and authentication or security status.",
          "Address and location data, such as region, province, city, barangay, street address, postal code, saved facilities, optional map position, and technician check-in records.",
          "Order and payment-related data, such as cart items, order status, delivery details, transaction references, receipts, and payment status. Full card credentials are handled by the applicable payment provider and should not be submitted to Cold Air ACT support fields.",
          "AC unit and warranty data, such as brand, model, horsepower, serial or QR identifier, installation date, environment details, coverage, and service history.",
          "Service data, such as concern descriptions, schedules, assigned branch or technician, work status, notes, photos, parts, diagnosis, and completion reports.",
          "Technical and communications data, such as device or browser information, security and access logs, preferences, OTP delivery status, support messages, and notification status.",
          "When AI-assisted AeroPulse features are enabled, relevant input data, generated recommendations, summaries, and review outcomes needed to provide and monitor those features.",
        ],
      },
      {
        id: "purposes",
        title: "3. Why we process personal data",
        bullets: [
          "Create, verify, secure, and support customer or authorized staff accounts.",
          "Confirm orders, allocate stock, process payment status, issue receipts, deliver products, and complete installation.",
          "Register AC units, administer warranties, schedule field service, show work progress, and maintain accurate service history.",
          "Route concerns to the correct branch, administrator, or technician and provide customer notifications.",
          "Detect misuse, protect accounts and system integrity, investigate incidents, and comply with lawful obligations.",
          "Improve reliability, reporting, operational planning, and—with appropriate safeguards—AI-assisted maintenance or demand recommendations.",
        ],
      },
      {
        id: "basis",
        title: "4. Basis for processing",
        paragraphs: [
          "Depending on the activity, processing may be necessary to perform a contract or requested service, comply with law, protect lawful interests and system security, establish or defend legal claims, or act on the customer’s consent. Where consent is the basis, it must be specific and informed and may be withdrawn, subject to lawful or contractual processing that remains necessary.",
        ],
      },
      {
        id: "sharing",
        title: "5. Who may receive personal data",
        paragraphs: [
          "Access is limited according to role and operational need. Relevant data may be shared with the assigned Cold Air ACT branch, authorized administrators, technicians, support personnel, and service providers that supply hosting, database, email or OTP, maps, analytics, payment, security, or AI functions.",
          "Data may also be disclosed to manufacturers or warranty providers for an authorized claim, to professional advisers where necessary, or to public authorities when required by law. Cold Air ACT does not sell customer personal data.",
        ],
      },
      {
        id: "location-media",
        title: "6. Location data and photos",
        paragraphs: [
          "Customer location is collected when an address is entered or when the customer permits a location-based feature. Technician location check-in is used to record a service-stage event and may be visible to the customer and authorized administrative users. It is not intended as continuous off-duty tracking.",
          "Photos provided for a unit, site, delivery, warranty, or service request are used for the relevant transaction, verification, diagnosis, documentation, dispute handling, and service history. Avoid including unrelated people or sensitive information in uploaded images.",
        ],
      },
      {
        id: "automated-processing",
        title: "7. AI-assisted and automated processing",
        paragraphs: [
          "If AeroPulse AI features are enabled, selected operational data may be used to generate forecasts, service recommendations, or summaries. Outputs are decision-support information and are subject to access controls, monitoring, and appropriate human review.",
          "Cold Air ACT will provide additional notice or obtain consent when required for profiling, automated processing, or a new purpose. A decision with legal effects will not be made solely by automated processing without the consent or other protection required by applicable law.",
        ],
      },
      {
        id: "retention",
        title: "8. Retention and deletion",
        paragraphs: [
          "Personal data is retained only for as long as reasonably necessary for the declared purpose, warranty or service history, transaction and accounting records, security, dispute resolution, legitimate business needs, or a legal requirement. When no longer required, data is securely deleted, anonymized, or restricted according to the applicable retention process.",
        ],
      },
      {
        id: "security",
        title: "9. Security measures",
        paragraphs: [
          "Cold Air ACT uses reasonable organizational, physical, and technical measures appropriate to the data and risk, including authentication controls, role-based access, protected communications, audit or security records, and service-provider safeguards. No online system can guarantee absolute security, so users must also protect their passwords, OTPs, and authenticator codes.",
        ],
      },
      {
        id: "rights",
        title: "10. Your data-subject rights",
        paragraphs: [
          "Subject to the conditions and limitations of Republic Act No. 10173 and its implementing rules, you may have the right to be informed, object, access, rectify, erase or block data, obtain data portability, claim damages, and file a complaint with the National Privacy Commission.",
          "To exercise a right, contact Cold Air ACT using the details above. We may need to verify identity and clarify the request before acting, and we will explain when a lawful exception or retention duty applies.",
        ],
      },
      {
        id: "device-storage",
        title: "11. Browser and device storage",
        paragraphs: [
          "The website and mobile app may use cookies, session storage, or protected local storage that is necessary for sign-in, cart continuity, registration progress, security, preferences, and core functionality. Disabling required storage may prevent parts of the service from working correctly.",
        ],
      },
      {
        id: "children",
        title: "12. Children’s data",
        paragraphs: [
          "The service is not designed for a child to independently enter a purchase or service contract. A parent or legal guardian must manage any transaction involving a minor and may exercise the minor’s privacy rights where applicable.",
        ],
      },
      {
        id: "updates-complaints",
        title: "13. Updates and complaints",
        paragraphs: [
          "This notice may be updated when processing activities, providers, system features, or legal requirements change. A revised effective date will be displayed, and additional notice or renewed consent will be provided when required.",
          "If a privacy concern is not resolved through Customer Support, you may seek guidance from or file an appropriate complaint with the National Privacy Commission.",
        ],
        links: [
          {
            label: "National Privacy Commission: Data-subject rights",
            href: "https://privacy.gov.ph/data-subject-rights/",
          },
          {
            label: "Republic Act No. 10173",
            href: "https://privacy.gov.ph/data-privacy-act/",
          },
        ],
      },
    ],
  },
};

export const LEGAL_POLICY_LIST = Object.values(LEGAL_POLICIES);

export function getLegalPolicy(policyId) {
  return LEGAL_POLICIES[policyId] || null;
}

