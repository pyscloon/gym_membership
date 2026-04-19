const fs = require('fs');
const path = 'c:/Users/Acer/Documents/Final_Project_Gym_Membership/gym-membership-system/src/components/AdminPaymentPanel.stories.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update imports
content = content.replace(
  /import \{ clearAllTransactions, saveTransaction, generateTransactionId \} from '\.\.\/lib\/paymentSimulator';/,
  "import { clearAllTransactions, saveTransaction, generateTransactionId, simulateAdminConfirmation, verifyOnlinePayment, rejectOnlinePayment, getStoredTransaction } from '../lib/paymentSimulator';"
);

// Update mock functions
content = content.replace(
  /const mockOnConfirmPayment = async \(transactionId: string, userId: string, userType: UserType\) => \{\s*console\.log\(.*\);\s*await new Promise\(resolve => setTimeout\(resolve, 800\)\);\s*\};/,
  `const mockOnConfirmPayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(\`✅ Confirmed payment \${transactionId} for \${userType} user \${userId}\`);
  await simulateAdminConfirmation(transactionId);
};`
);

content = content.replace(
  /const mockOnDeclinePayment = async \(transactionId: string, userId: string, userType: UserType\) => \{\s*console\.log\(.*\);\s*await new Promise\(resolve => setTimeout\(resolve, 800\)\);\s*\};/,
  `const mockOnDeclinePayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(\`❌ Declined payment \${transactionId} for \${userType} user \${userId}\`);
  const stored = await getStoredTransaction(transactionId);
  if (stored) {
    stored.status = 'failed';
    await saveTransaction(stored);
  }
};`
);

content = content.replace(
  /const mockOnVerifyOnlinePayment = async \(transactionId: string, userId: string, userType: UserType\) => \{\s*console\.log\(.*\);\s*await new Promise\(resolve => setTimeout\(resolve, 800\)\);\s*\};/,
  `const mockOnVerifyOnlinePayment = async (transactionId: string, userId: string, userType: UserType) => {
  console.log(\`✅ Verified online payment \${transactionId} for \${userType} user \${userId}\`);
  await verifyOnlinePayment(transactionId);
};`
);

content = content.replace(
  /const mockOnRejectOnlinePayment = async \(transactionId: string, userId: string, userType: UserType, reason: string\) => \{\s*console\.log\(.*\);\s*await new Promise\(resolve => setTimeout\(resolve, 800\)\);\s*\};/,
  `const mockOnRejectOnlinePayment = async (transactionId: string, userId: string, userType: UserType, reason: string) => {
  console.log(\`❌ Rejected online payment \${transactionId} for \${userType} user \${userId} - Reason: \${reason}\`);
  await rejectOnlinePayment(transactionId, reason);
};`
);

// Fix render functions
let newContent = content;
newContent = newContent.replace(
  /render: \(args\) => \{\s*void (setupTransactions\([\s\S]*?\));\s*return \(/g,
  (match, setupCall) => {
    return `loaders: [
    async () => {
      await ${setupCall};
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (`
  }
);

newContent = newContent.replace(
  /render: \(args\) => \{\s*const payments: PaymentTransaction\[\] = \[\];([\s\S]*?)void (setupTransactions\(payments\));\s*return \(/,
  (match, logic, setupCall) => {
    return `loaders: [
    async () => {
      const payments: PaymentTransaction[] = [];${logic}await ${setupCall};
      return { loaded: true };
    }
  ],
  render: (args) => {
    return (`
  }
);

fs.writeFileSync(path, newContent);
console.log('Successfully updated stories file.');
