// Widget labels in English and Nigerian Pidgin. The assistant's replies follow the customer's
// own language whichever is set here.

export type Language = "en" | "pcm";

const strings = {
  en: {
    open: "Chat to order",
    close: "Close chat",
    title: "Talk2Buy",
    subtitle: "Order by chatting",
    deliverTo: "Deliver to",
    pickCity: "Choose your city",
    greeting: "Hi! Tell me what you need, your budget and how fast you need it.",
    examples: ["Jollof rice under ₦3,000", "5kg rice, 2 tins of tomato paste and Indomie", "Did my payment go through?"],
    placeholder: "Tell me what you need…",
    send: "Send",
    add: "Add",
    added: (name: string, shop: string) => `Add ${name} from ${shop}`,
    mins: (n: number) => `${n} mins`,
    total: "Total",
    notFound: "Not found",
    placeOrder: "Place order",
    placeOrderMessage: "Yes, place the order",
    confirm: "Confirm order",
    confirming: "Confirming…",
    waitingConfirm: "Waiting for you to confirm",
    waitingPayment: "Confirmed · waiting for payment",
    paid: (eta: number | null) => (eta === null ? "Paid" : `Paid · arriving in about ${eta} mins`),
    failed: "Payment failed · you can pay again on this site",
    error: "Something went wrong. Please try again.",
    feedbackGood: "Good answer",
    feedbackBad: "Bad answer",
    feedbackPrompt: "What went wrong? (optional)",
    feedbackSend: "Send",
    feedbackThanks: "Thanks for the feedback",
  },
  pcm: {
    open: "Chat to order",
    close: "Close chat",
    title: "Talk2Buy",
    subtitle: "Order by chatting",
    deliverTo: "Deliver to",
    pickCity: "Pick your city",
    greeting: "How far! Tell me wetin you need, your budget and how fast you want am.",
    examples: ["Jollof wey no pass 3k", "5kg rice, 2 tin tomato paste and Indomie", "My money don enter?"],
    placeholder: "Wetin you need?",
    send: "Send",
    add: "Add am",
    added: (name: string, shop: string) => `Add ${name} from ${shop}`,
    mins: (n: number) => `${n} mins`,
    total: "Total",
    notFound: "No dey",
    placeOrder: "Order am",
    placeOrderMessage: "Yes, order am",
    confirm: "Confirm order",
    confirming: "E dey confirm…",
    waitingConfirm: "E dey wait make you confirm",
    waitingPayment: "Confirmed · e dey wait for payment",
    paid: (eta: number | null) => (eta === null ? "Payment don enter" : `Payment don enter · e go reach in about ${eta} mins`),
    failed: "Payment no go · you fit pay again for this site",
    error: "Something no work. Abeg try again.",
    feedbackGood: "Correct answer",
    feedbackBad: "E no correct",
    feedbackPrompt: "Wetin no correct? (you fit skip am)",
    feedbackSend: "Send",
    feedbackThanks: "Thank you for the feedback",
  },
};

export type Strings = (typeof strings)["en"];
export const getStrings = (language: Language): Strings => strings[language] ?? strings.en;

export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
