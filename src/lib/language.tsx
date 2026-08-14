import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Language = "en" | "fr";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => undefined,
  toggleLanguage: () => undefined,
});

const FR: Record<string, string> = {
  "Home": "Accueil",
  "Services": "Services",
  "About": "À propos",
  "Partners": "Partenaires",
  "Customer Portal": "Portail client",
  "Contact": "Contact",
  "Free Quote": "Devis gratuit",
  "Get a Free Quote": "Obtenir un devis gratuit",
  "Get My Free Quote": "Obtenir mon devis gratuit",
  "Get a Quote": "Obtenir un devis",
  "Get a quote": "Obtenir un devis",
  "View all services": "Voir tous les services",
  "Call us": "Appelez-nous",
  "Email us": "Écrivez-nous",
  "One Company. Multiple Solutions. All Seasons.": "Une entreprise. Plusieurs solutions. Toutes saisons.",
  "One company. Multiple solutions.": "Une entreprise. Plusieurs solutions.",
  "Everything You Need.": "Tout ce dont vous avez besoin.",
  "One Trusted Team.": "Une équipe de confiance.",
  "Professional services for homes, businesses and vehicles across Ottawa & Gatineau.": "Des services professionnels pour les résidences, les entreprises et les véhicules à Ottawa et Gatineau.",
  "One company": "Une seule entreprise",
  "Multiple home & property services": "Plusieurs services pour la maison et la propriété",
  "One portal": "Un seul portail",
  "Quotes, appointments & invoices": "Devis, rendez-vous et factures",
  "One local team": "Une équipe locale",
  "Ottawa & Gatineau service area": "Zone de service Ottawa et Gatineau",
  "Our services": "Nos services",
  "Practical help for your home, property and vehicle": "Des solutions pratiques pour votre maison, votre propriété et votre véhicule",
  "House Cleaning": "Nettoyage résidentiel",
  "Vehicle Detailing": "Esthétique automobile",
  "Handyman & Maint.": "Petits travaux et entretien",
  "Office Cleaning": "Nettoyage de bureaux",
  "Commercial Snow": "Déneigement commercial",
  "Commercial Lawn": "Entretien paysager commercial",
  "Property Maintenance": "Entretien de propriété",
  "Janitorial Services": "Services de conciergerie",
  "Home or business?": "Maison ou entreprise?",
  "Residential": "Résidentiel",
  "Commercial": "Commercial",
  "What type of cleaning do you need?": "Quel type de nettoyage avez-vous besoin?",
  "What is the property type?": "Quel est le type de propriété?",
  "How many bedrooms?": "Combien de chambres?",
  "How many bathrooms?": "Combien de salles de bain?",
  "Do you have a basement?": "Avez-vous un sous-sol?",
  "How many stairs?": "Combien d’escaliers?",
  "How many living rooms?": "Combien de salons?",
  "How often do you need this service?": "À quelle fréquence avez-vous besoin de ce service?",
  "What is the vehicle type?": "Quel est le type de véhicule?",
  "What service do you require?": "De quel service avez-vous besoin?",
  "Do you need any extra services?": "Avez-vous besoin de services supplémentaires?",
  "What service do you need?": "De quel service avez-vous besoin?",
  "What is the size of your lawn?": "Quelle est la superficie de votre pelouse?",
  "How often?": "À quelle fréquence?",
  "What type of move is this?": "Quel type de déménagement s’agit-il?",
  "What is the size of your current residence?": "Quelle est la taille de votre résidence actuelle?",
  "Do you need packing materials?": "Avez-vous besoin de matériel d’emballage?",
  "Do you need loading and unloading assistance?": "Avez-vous besoin d’aide pour le chargement et le déchargement?",
  "What do you need cleared?": "Quelle zone doit être déneigée?",
  "What is the size of your driveway?": "Quelle est la taille de votre entrée?",
  "What type of service do you prefer?": "Quel type de service préférez-vous?",
  "Which service do you need?": "De quel service avez-vous besoin?",
  "What is the type of vehicle?": "Quel est le type de véhicule?",
  "Are the tires already mounted on rims?": "Les pneus sont-ils déjà montés sur des jantes?",
  "What kind of job do you need?": "Quel type de travail avez-vous besoin?",
  "How urgent is it?": "Quel est le degré d’urgence?",
  "Approximate size of your space?": "Superficie approximative de votre espace?",
  "Property type": "Type de propriété",
  "Coverage needed": "Zone à couvrir",
  "Scope of service": "Étendue du service",
  "What do you need help with?": "Avec quoi avez-vous besoin d’aide?",
  "Industry": "Secteur d’activité",
  "Frequency": "Fréquence",
  "One-Time": "Une fois",
  "Interior Detailing": "Nettoyage intérieur détaillé",
  "Full Detail (Interior + Exterior)": "Nettoyage complet (intérieur + extérieur)",
  "Lawn Mowing": "Tonte de pelouse",
  "Hedge Trimming": "Taille de haies",
  "Spring Cleanup": "Nettoyage de printemps",
  "Fall Cleanup": "Nettoyage d’automne",
  "Garden Maintenance": "Entretien du jardin",
  "Residential Move (Local)": "Déménagement résidentiel (local)",
  "Business Move (Office)": "Déménagement d’entreprise (bureau)",
  "Furniture Only": "Meubles seulement",
  "Packing Service": "Service d’emballage",
  "Yes, full packing service": "Oui, service d’emballage complet",
  "Yes, boxes and tape": "Oui, boîtes et ruban adhésif",
  "No, I will pack myself": "Non, je ferai l’emballage moi-même",
  "No, just transportation": "Non, transport seulement",
  "Entire Property": "Toute la propriété",
  "Roof Raking": "Déneigement du toit",
  "Single Car": "Une voiture",
  "Double Car": "Deux voitures",
  "Triple+ Car": "Trois voitures ou plus",
  "Per Visit (On-Demand)": "Par visite (sur demande)",
  "Seasonal Contract (Unlimited)": "Contrat saisonnier (illimité)",
  "Winter → Summer swap": "Passage hiver → été",
  "Summer → Winter swap": "Passage été → hiver",
  "Yes (On Rims)": "Oui (sur jantes)",
  "No (Off Rims)": "Non (hors jantes)",
  "Furniture assembly": "Assemblage de meubles",
  "Mounting / installation": "Montage / installation",
  "Painting touch-ups": "Retouches de peinture",
  "Within 2 weeks": "Dans les 2 semaines",
  "Under 1,000 sq ft": "Moins de 1 000 pi²",
  "Parking lot": "Stationnement",
  "Full property + salting": "Toute la propriété + épandage de sel",
  "Mowing only": "Tonte seulement",
  "Full landscape maintenance": "Entretien paysager complet",
  "Seasonal cleanups": "Nettoyages saisonniers",
  "General repairs": "Réparations générales",
  "Preventative maintenance": "Entretien préventif",
  "Turnovers / unit prep": "Préparation entre occupants / unités",
  "On-call service": "Service sur appel",
  "Lawn & Landscaping": "Pelouse et aménagement paysager",
  "Snow Removal": "Déneigement",
  "Moving Services": "Services de déménagement",
  "Mobile Tire Change": "Changement de pneus mobile",
  "Small Repairs": "Petits travaux",
  "Regular, deep, move-in and move-out cleaning.": "Nettoyage régulier, en profondeur, avant emménagement et après déménagement.",
  "Mowing, trimming, cleanups and garden care.": "Tonte, taille, nettoyage saisonnier et entretien du jardin.",
  "Residential and commercial seasonal service.": "Service saisonnier résidentiel et commercial.",
  "Local moving, loading and packing support.": "Déménagement local, chargement et aide à l’emballage.",
  "Seasonal tire changes conveniently at your location.": "Changement saisonnier de pneus directement à votre emplacement.",
  "Practical handyman and property maintenance help.": "Petits travaux pratiques et entretien de propriété.",
  "Why clients choose this process": "Pourquoi les clients choisissent ce processus",
  "Professional service without the usual back-and-forth": "Un service professionnel sans échanges compliqués",
  "From the first request to the final invoice, your information stays organized. You can send photos, review the quote, choose a time, sign electronically and keep your documents in one place.": "De la première demande à la facture finale, vos informations restent organisées. Vous pouvez envoyer des photos, consulter le devis, choisir un horaire, signer électroniquement et conserver vos documents au même endroit.",
  "Free quote requests": "Demandes de devis gratuites",
  "Upload photos with your request": "Ajoutez des photos à votre demande",
  "Estimated duration before approval": "Durée estimée avant approbation",
  "Choose an available appointment": "Choisissez un rendez-vous disponible",
  "Electronic quote acceptance": "Acceptation électronique du devis",
  "Invoices and service history in your portal": "Factures et historique des services dans votre portail",
  "Tell us what you need": "Dites-nous ce dont vous avez besoin",
  "Choose your service, answer a few questions and add useful photos.": "Choisissez votre service, répondez à quelques questions et ajoutez des photos utiles.",
  "Review your quote": "Consultez votre devis",
  "See the price, estimated duration and service details before accepting.": "Consultez le prix, la durée estimée et les détails du service avant d’accepter.",
  "Choose your appointment": "Choisissez votre rendez-vous",
  "Select an available time that works for you.": "Sélectionnez un horaire disponible qui vous convient.",
  "Follow everything online": "Suivez tout en ligne",
  "Access signed quotes, interventions, photos and invoices in your portal.": "Accédez aux devis signés, interventions, photos et factures dans votre portail.",
  "Start here": "Commencez ici",
  "Answer a few questions so we can prepare a more accurate quote. You can also add photos to help us understand the job.": "Répondez à quelques questions afin que nous puissions préparer un devis plus précis. Vous pouvez aussi ajouter des photos pour nous aider à comprendre le travail.",
  "Local service": "Service local",
  "Serving Ottawa, Gatineau and surrounding communities": "Au service d’Ottawa, Gatineau et des communautés environnantes",
  "Need to confirm that we serve your neighbourhood? Call or email us and we’ll let you know before you request a quote.": "Vous voulez vérifier si nous desservons votre quartier? Appelez-nous ou écrivez-nous avant de demander un devis.",
  "Your quotes, appointments and invoices — in one place": "Vos devis, rendez-vous et factures — au même endroit",
  "Return anytime to review signed quotes, scheduled services, work photos and invoices.": "Revenez à tout moment pour consulter vos devis signés, services planifiés, photos des travaux et factures.",
  "Open Customer Portal": "Ouvrir le portail client",
  "Our Mission": "Notre mission",
  "Our Vision": "Notre vision",
  "What we stand for": "Nos valeurs",
  "To make home and property care simple, transparent and dependable for every household and business in Ottawa-Gatineau.": "Rendre l’entretien des maisons et propriétés simple, transparent et fiable pour les familles et entreprises d’Ottawa-Gatineau.",
  "To be the National Capital Region's most trusted multi-service group — the first name people think of when something needs to get done right.": "Devenir le groupe multiservices le plus digne de confiance de la région de la capitale nationale — le premier nom auquel on pense lorsqu’un travail doit être bien fait.",
  "Send us a message": "Envoyez-nous un message",
  "Name *": "Nom *",
  "Email *": "Courriel *",
  "Phone": "Téléphone",
  "Message *": "Message *",
  "Quick Links": "Liens rapides",
  "For Customers": "Pour les clients",
  "Get a Quote": "Demander un devis",
  "Become a Partner": "Devenir partenaire",
  "Legal": "Informations légales",
  "Privacy Policy": "Politique de confidentialité",
  "Terms & Conditions": "Conditions générales",
  "All rights reserved.": "Tous droits réservés.",
  "Home and property services across Ottawa and Gatineau, with clear quotes, online scheduling and a client portal that keeps everything in one place.": "Services pour maisons et propriétés à Ottawa et Gatineau, avec devis clairs, réservation en ligne et portail client centralisé.",

  "CLIENT PORTAL": "PORTAIL CLIENT",
  "Balance due": "Solde dû",
  "Electronically signed by": "Signé électroniquement par",
  "Confirm this appointment": "Confirmer ce rendez-vous",
  "Continue to signature": "Continuer vers la signature",
  "Paid in full": "Payée en totalité",
  "Last payment:": "Dernier paiement :",
  "Address on file": "Adresse au dossier",
  "Issue date": "Date d’émission",
  "Due date": "Date d’échéance",
  "Amount paid": "Montant payé",
  "Thank you for your business.": "Merci de votre confiance.",
  "Access your account": "Accédez à votre compte",
  "Receive a secure sign-in link by email. No password is required.": "Recevez un lien de connexion sécurisé par courriel. Aucun mot de passe n’est requis.",
  "Email address": "Adresse courriel",
  "Use the same email address you provided when requesting your quote.": "Utilisez la même adresse courriel que celle fournie lors de votre demande de devis.",
  "Review and sign your quotes, then track your invoices and jobs.": "Consultez et signez vos devis, puis suivez vos factures et interventions.",
  "Loading…": "Chargement…",
  "Sign out": "Se déconnecter",
  "My Quotes": "Mes devis",
  "My Invoices": "Mes factures",
  "My Jobs": "Mes interventions",
  "Quotes": "Devis",
  "Invoices": "Factures",
  "Jobs": "Interventions",
  "Estimated duration:": "Durée estimée :",
  "Appointment booked": "Rendez-vous réservé",
  "Reschedule my appointment": "Modifier mon rendez-vous",
  "Choose a time and sign": "Choisir un horaire et signer",
  "Reject": "Refuser",
  "Choose my appointment": "Choisir mon rendez-vous",
  "Total": "Total",
  "View invoice": "Voir la facture",
  "Download PDF": "Télécharger le PDF",
  "PAID": "PAYÉE",
  "AMOUNT DUE": "MONTANT DÛ",
  "Paid": "Payé",
  "Unpaid": "Non payé",
  "Partially Paid": "Partiellement payé",
  "Scheduled": "Planifiée",
  "Completed": "Terminée",
  "Cancelled": "Annulée",
  "Accepted": "Accepté",
  "Sent": "Envoyé",
  "Draft": "Brouillon",
  "Expired": "Expiré",
  "Rejected": "Refusé",
  "View quote": "Voir le devis",
  "Signed electronically": "Signé électroniquement",
  "Pay now": "Payer maintenant",
  "Pay invoice": "Payer la facture",
  "Payment": "Paiement",
  "Payments": "Paiements",
  "Date": "Date",
  "Method": "Mode",
  "Reference": "Référence",
  "Description": "Description",
  "Qty": "Qté",
  "Unit price": "Prix unitaire",
  "Amount": "Montant",
  "Subtotal before tax": "Sous-total avant taxes",
  "Discount": "Rabais",
  "Balance": "Solde",
  "Billed to": "Facturé à",
  "INVOICE": "FACTURE",
  "Service details are not available.": "Les détails du service ne sont pas disponibles.",
  "Completed work photos": "Photos du travail terminé",
  "Photos attached to this invoice after the job.": "Photos jointes à cette facture après l’intervention.",
  "Keep this invoice for your records.": "Conservez cette facture dans vos dossiers.",
  "ELECTRONIC SIGNATURE": "SIGNATURE ÉLECTRONIQUE",
  "Close": "Fermer",
  "Selected time before signing": "Horaire choisi avant la signature",
  "Change time slot": "Changer le créneau",
  "Full name of signer": "Nom complet du signataire",
  "Draw your signature": "Dessinez votre signature",
  "Clear": "Effacer",
  "The date, time, customer account, available IP address, and browser information will be recorded as evidence of acceptance.": "La date, l’heure, le compte client, l’adresse IP disponible et les informations du navigateur seront enregistrés comme preuve d’acceptation.",
  "APPOINTMENT SELECTION": "CHOIX DU RENDEZ-VOUS",
  "Choose a new available time": "Choisissez un nouvel horaire disponible",
  "Available times": "Horaires disponibles",
  "No time slots are available for this date. Choose another day.": "Aucun créneau n’est disponible à cette date. Choisissez un autre jour.",
  "Important:": "Important :",
  "Choose the appointment that works for you first. If the quote has not yet been accepted, the time slot will be confirmed when you sign electronically.": "Choisissez d’abord le rendez-vous qui vous convient. Si le devis n’a pas encore été accepté, le créneau sera confirmé lors de votre signature électronique.",
  "Great! Where should we send your quote?": "Parfait! Où devons-nous envoyer votre devis?",
  "We'll get back to you within one business day.": "Nous vous répondrons dans un délai d’un jour ouvrable.",
  "Requesting quote for:": "Demande de devis pour :",
  "Phone Number": "Numéro de téléphone",
  "Preferred Contact Method": "Mode de contact préféré",
  "Additional Details": "Détails supplémentaires",
  "Anything specific we should know?": "Y a-t-il des détails particuliers que nous devrions connaître?",
  "Get My Free Quote Now": "Obtenir mon devis gratuit maintenant",
  "A connection error occurred. Please try again.": "Une erreur de connexion s’est produite. Veuillez réessayer.",
  "Application received — we'll be in touch.": "Demande reçue — nous vous contacterons bientôt.",
  "Quote request received — we'll contact you soon!": "Demande de devis reçue — nous vous contacterons bientôt!",
  "Quote saved, but admin email was not sent.": "Le devis a été enregistré, mais le courriel à l’administrateur n’a pas été envoyé.",
  "The quote request could not be submitted. Please try again.": "La demande de devis n’a pas pu être envoyée. Veuillez réessayer.",
  "Sending…": "Envoi…",
  "Select an option": "Sélectionnez une option",
  "Not provided": "Non fourni",
  "Business / Contact Name": "Entreprise / nom du contact",
  "Tell us who you are so we can point you to the right form.": "Dites-nous qui vous êtes afin que nous puissions vous diriger vers le bon formulaire.",
  "I need a service for my home or business.": "J’ai besoin d’un service pour ma maison ou mon entreprise.",
  "I want to offer subcontracting services.": "Je souhaite offrir des services de sous-traitance.",
  "Services for your home.": "Services pour votre maison.",
  "Services for your business or property.": "Services pour votre entreprise ou votre propriété.",
  "Pick what you need — we'll ask a few quick questions to price it accurately.": "Choisissez ce dont vous avez besoin — nous vous poserons quelques questions rapides afin d’établir un prix précis.",
  "Answer a few quick questions so we can prepare an accurate quote.": "Répondez à quelques questions rapides afin que nous puissions préparer un devis précis.",
  "Share a few details and our team will reach out.": "Donnez-nous quelques détails et notre équipe communiquera avec vous.",
  "This helps us match you with the right team and pricing.": "Cela nous aide à vous proposer la bonne équipe et une tarification adaptée.",
  "My Quotes": "Mes devis",
  "My Invoices": "Mes factures",
  "My Jobs": "Mes interventions",
  "Jobs": "Interventions",
  "Access your account": "Accédez à votre compte",
  "Review and sign your quotes, then track your invoices and jobs.": "Consultez et signez vos devis, puis suivez vos factures et vos interventions.",
  "Email address": "Adresse courriel",
  "Receive a secure sign-in link by email. No password is required.": "Recevez un lien de connexion sécurisé par courriel. Aucun mot de passe n’est requis.",
  "Use the same email address you provided when requesting your quote.": "Utilisez la même adresse courriel que celle fournie lors de votre demande de devis.",
  "Send me a sign-in link": "M’envoyer un lien de connexion",
  "A secure sign-in link has been sent to your email address.": "Un lien de connexion sécurisé a été envoyé à votre adresse courriel.",
  "Sign out": "Déconnexion",
  "Choose a time and sign": "Choisir un horaire et signer",
  "Choose my appointment": "Choisir mon rendez-vous",
  "Reschedule my appointment": "Modifier mon rendez-vous",
  "Appointment booked": "Rendez-vous réservé",
  "Confirm this appointment": "Confirmer ce rendez-vous",
  "Confirming…": "Confirmation…",
  "Continue to signature": "Continuer vers la signature",
  "Unable to load available times.": "Impossible de charger les horaires disponibles.",
  "Unable to confirm this time slot.": "Impossible de confirmer ce créneau.",
  "Enter your name, draw your signature, and accept the statement.": "Entrez votre nom, dessinez votre signature et acceptez la déclaration.",
  "Signature is unavailable.": "La signature n’est pas disponible.",
  "Unable to save the signature.": "Impossible d’enregistrer la signature.",
  "Sign and accept quote": "Signer et accepter le devis",
  "Saving…": "Enregistrement…",
  "I confirm that I have reviewed this quote, including the estimated duration, and accept the services, price, notes, and terms shown. I selected the time slot above. By signing this quote, I confirm this appointment and agree to have the service performed and to pay the invoice according to the accepted quote and any additional work I expressly authorize.": "Je confirme avoir examiné ce devis, y compris la durée estimée, et accepter les services, le prix, les notes et les conditions indiqués. J’ai choisi le créneau ci-dessus. En signant ce devis, je confirme ce rendez-vous et j’accepte que le service soit effectué et de payer la facture conformément au devis accepté ainsi que tout travail supplémentaire que j’autorise expressément.",
  "View invoice": "Voir la facture",
  "Download PDF": "Télécharger le PDF",
  "My invoices": "Mes factures",
  "Amount paid": "Montant payé",
  "Balance due": "Solde à payer",
  "Issue date": "Date d’émission",
  "Due date": "Date d’échéance",
  "Unit price": "Prix unitaire",
  "Price": "Prix",
  "Paid in full": "Payée en totalité",
  "Bank transfer": "Virement bancaire",
  "Interac e-Transfer": "Virement Interac",
  "Credit card": "Carte de crédit",
  "Debit card": "Carte de débit",
  "Cash": "Espèces",
  "Cheque": "Chèque",
  "Draft": "Brouillon",
  "Pending review": "En attente de révision",
  "Sent": "Envoyé",
  "Viewed": "Consulté",
  "Accepted": "Accepté",
  "Rejected": "Refusé",
  "Expired": "Expiré",
  "Cancelled": "Annulé",
  "Converted": "Converti",
  "Partially paid": "Partiellement payée",
  "Paid": "Payée",
  "Overdue": "En retard",
  "Unscheduled": "Non planifiée",
  "Scheduled": "Planifiée",
  "In progress": "En cours",
  "Completed": "Terminée",
  "Date to be confirmed": "Date à confirmer",
  "Duration to be confirmed": "Durée à confirmer",
  "Address on file": "Adresse au dossier",
  "Work completed": "Travail terminé",
  "Thank you for your business.": "Merci de votre confiance.",
  "Airbnb Turnover": "Rotation Airbnb",
  "Deep Cleaning": "Nettoyage en profondeur",
  "Regular Maintenance": "Entretien régulier",
  "Move-In": "Avant emménagement",
  "Move-Out": "Après déménagement",
  "Exterior Wash": "Lavage extérieur",
  "Ceramic Coating": "Revêtement céramique",
  "Headlight Restoration": "Restauration des phares",
  "Pet Hair Removal": "Élimination des poils d’animaux",
  "Odor Removal": "Élimination des odeurs",
  "Small repair": "Petite réparation",
  "Battery Boost": "Survoltage de batterie",
  "Flat Tire Repair": "Réparation de pneu crevé",
  "Driveway": "Entrée",
  "Walkway": "Allée piétonne",
  "Walkways": "Allées piétonnes",
  "House": "Maison",
  "Apartment": "Appartement",
  "Townhouse": "Maison en rangée",
  "Condo": "Copropriété",
  "Office building": "Immeuble de bureaux",
  "Retail plaza": "Centre commercial",
  "Industrial lot": "Terrain industriel",
  "Small (Under 1/4 acre)": "Petite (moins de 1/4 acre)",
  "Medium (1/4 – 1/2 acre)": "Moyenne (1/4 à 1/2 acre)",
  "Large (1/2 – 1 acre)": "Grande (1/2 à 1 acre)",
  "Extra Large (1+ acres)": "Très grande (1 acre ou plus)",
  "This week": "Cette semaine",
  "Weekdays": "Jours de semaine",
  "3× per week": "3 fois par semaine",
  "Studio": "Studio",
  "1-Bedroom": "1 chambre",
  "2-Bedroom": "2 chambres",
  "3-Bedroom": "3 chambres",
  "4+ Bedroom": "4 chambres ou plus",
  "Sedan": "Berline",
  "Truck": "Camionnette",
  "Minivan": "Fourgonnette",
  "Luxury Vehicle": "Véhicule de luxe",
  "Medical": "Médical",
  "Industrial": "Industriel",
  "Retail": "Commerce de détail",
  "Submit Application": "Envoyer la demande",
  "Tell us about your business": "Parlez-nous de votre entreprise",
  "Join our partner network": "Rejoignez notre réseau de partenaires",
  "Nothing here yet.": "Aucun élément pour le moment.",

  "Are you a Customer or a Partner?": "Êtes-vous un client ou un partenaire?",
  "I'm a Customer": "Je suis un client",
  "I'm a Client": "Je suis un client",
  "I'm a Partner": "Je suis un partenaire",
  "Residential": "Résidentiel",
  "Commercial": "Commercial",
  "You": "Vous",
  "Type": "Type",
  "Service": "Service",
  "Details": "Détails",
  "Quote": "Devis",
  "Continue": "Continuer",
  "← Back": "← Retour",
  "Select all that apply.": "Sélectionnez toutes les options applicables.",
  "Job photos (optional)": "Photos du travail (facultatif)",
  "Add up to 8 photos to help us prepare a more accurate quote. Maximum 8 MB per photo.": "Ajoutez jusqu’à 8 photos pour nous aider à préparer un devis plus précis. Maximum 8 Mo par photo.",
  "Maximum 8 photos.": "Maximum 8 photos.",
  "Full Name": "Nom complet",
  "Email Address": "Adresse courriel",
  "Address or Postal Code": "Adresse ou code postal",
  "Primary Trade": "Métier principal",
  "Select a trade": "Sélectionnez un métier",
  "Please complete all required fields.": "Veuillez remplir tous les champs obligatoires.",
  "Yes": "Oui",
  "No": "Non",
  "Other": "Autre",
  "Daily": "Quotidien",
  "Weekly": "Hebdomadaire",
  "Bi-Weekly": "Toutes les deux semaines",
  "Monthly": "Mensuel",
  "Flexible": "Flexible",

  "Information we collect": "Informations que nous recueillons",
  "How we use it": "Comment nous les utilisons",
  "Sharing": "Partage",
  "Your choices": "Vos choix",
  "Quotes & bookings": "Devis et réservations",
  "Payment": "Paiement",
  "Cancellations": "Annulations",
  "Liability": "Responsabilité",
  "Governing law": "Droit applicable",
  "Read more →": "Lire la suite →",
  "Page not found": "Page introuvable",
  "The page you're looking for doesn't exist or has been moved.": "La page que vous recherchez n’existe pas ou a été déplacée.",
  "Go home": "Retour à l’accueil",
  "This page didn't load": "Cette page ne s’est pas chargée",
  "Something went wrong on our end. You can try refreshing or head back home.": "Une erreur s’est produite. Vous pouvez actualiser la page ou revenir à l’accueil.",
  "Try again": "Réessayer",
};

const RULES: Array<[RegExp, (...matches: string[]) => string]> = [
  [/^Requesting quote for:\s*(.+)$/i, (_all, service) => `Demande de devis pour : ${service}`],
  [/^Hello\s+(.+)$/i, (_all, name) => `Bonjour ${name}`],
  [/^Welcome,\s*(.+)$/i, (_all, name) => `Bonjour, ${name}`],
  [/^Created\s+(.+)$/i, (_all, date) => `Créé le ${date}`],
  [/^Valid until\s+(.+)$/i, (_all, date) => `Valide jusqu’au ${date}`],
  [/^Issued\s+(.+)$/i, (_all, date) => `Émise le ${date}`],
  [/^Due\s+(.+)$/i, (_all, date) => `Échéance ${date}`],
  [/^(\d+)\s+photo\(s\)$/i, (_all, count) => `${count} photo(s)`],
  [/^Estimated duration:\s*(.+)$/i, (_all, value) => `Durée estimée : ${value}`],
];

function translateString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const exact = FR[trimmed];
  let translated = exact;
  if (!translated) {
    for (const [pattern, replace] of RULES) {
      const match = trimmed.match(pattern);
      if (match) {
        translated = replace(...match);
        break;
      }
    }
  }
  if (!translated || translated === trimmed) return value;
  const prefix = value.match(/^\s*/)?.[0] ?? "";
  const suffix = value.match(/\s*$/)?.[0] ?? "";
  return `${prefix}${translated}${suffix}`;
}

type TextRecord = { original: string; translated: string };
type AttrRecord = Record<string, { original: string; translated: string }>;
const textRecords = new WeakMap<Text, TextRecord>();
const attrRecords = new WeakMap<Element, AttrRecord>();
const ATTRS = ["placeholder", "title", "aria-label"] as const;

function shouldIgnore(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!element) return false;
  if (element.closest('[data-i18n-ignore="true"]')) return true;
  return Boolean(element.closest("script,style,code,pre,textarea"));
}

function translateTextNode(node: Text) {
  if (shouldIgnore(node)) return;
  const current = node.nodeValue ?? "";
  const existing = textRecords.get(node);
  let original = current;
  if (existing && current === existing.translated) original = existing.original;
  else if (existing && current !== existing.translated) original = current;
  const translated = translateString(original);
  textRecords.set(node, { original, translated });
  if (current !== translated) node.nodeValue = translated;
}

function restoreTextNode(node: Text) {
  const record = textRecords.get(node);
  if (record && node.nodeValue === record.translated) node.nodeValue = record.original;
}

function translateElementAttrs(element: Element) {
  if (shouldIgnore(element)) return;
  const records = attrRecords.get(element) ?? {};
  for (const attr of ATTRS) {
    const current = element.getAttribute(attr);
    if (!current) continue;
    const existing = records[attr];
    const original = existing && current === existing.translated ? existing.original : current;
    const translated = translateString(original);
    records[attr] = { original, translated };
    if (translated !== current) element.setAttribute(attr, translated);
  }
  attrRecords.set(element, records);
}

function restoreElementAttrs(element: Element) {
  const records = attrRecords.get(element);
  if (!records) return;
  for (const attr of ATTRS) {
    const record = records[attr];
    if (record && element.getAttribute(attr) === record.translated) element.setAttribute(attr, record.original);
  }
}

function walk(root: Node, language: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    language === "fr" ? translateTextNode(root as Text) : restoreTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    language === "fr" ? translateElementAttrs(root as Element) : restoreElementAttrs(root as Element);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) language === "fr" ? translateTextNode(node as Text) : restoreTextNode(node as Text);
    else language === "fr" ? translateElementAttrs(node as Element) : restoreElementAttrs(node as Element);
    node = walker.nextNode();
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("omsg-language");
    if (saved === "fr") setLanguageState("fr");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("omsg-language", language);
    walk(document.body, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") walk(mutation.target, language);
        for (const node of mutation.addedNodes) walk(node, language);
        if (mutation.type === "attributes") walk(mutation.target, language);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => observer.disconnect();
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);
  const toggleLanguage = useCallback(() => setLanguageState((current) => current === "en" ? "fr" : "en"), []);
  const value = useMemo(() => ({ language, setLanguage, toggleLanguage }), [language, setLanguage, toggleLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div data-i18n-ignore="true" className={`inline-flex items-center rounded-xl border border-border/80 bg-background/95 p-1 shadow-sm backdrop-blur ${compact ? "text-[11px]" : "text-xs"}`} aria-label="Language selector">
      <button type="button" onClick={() => setLanguage("en")} className={`rounded-lg px-2.5 py-1.5 font-bold transition ${language === "en" ? "bg-navy text-white" : "text-foreground/65 hover:bg-secondary"}`} aria-pressed={language === "en"}>EN</button>
      <button type="button" onClick={() => setLanguage("fr")} className={`rounded-lg px-2.5 py-1.5 font-bold transition ${language === "fr" ? "bg-navy text-white" : "text-foreground/65 hover:bg-secondary"}`} aria-pressed={language === "fr"}>FR</button>
    </div>
  );
}

export function FloatingLanguageSwitcher() {
  return (
    <div data-i18n-ignore="true" className="fixed bottom-4 right-4 z-[100] sm:bottom-5 sm:right-5 lg:hidden">
      <LanguageSwitcher compact />
    </div>
  );
}
