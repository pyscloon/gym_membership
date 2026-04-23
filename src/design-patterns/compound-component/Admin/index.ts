import { AdminPaymentProvider } from './AdminPaymentContext';
import {
  AdminSummary,
  AdminRequestList,
  AdminPaymentCard,
  AdminEvidenceModal
} from './AdminPaymentComponents';

export const AdminPayments = {
  Provider: AdminPaymentProvider,
  Summary: AdminSummary,
  List: AdminRequestList,
  Card: AdminPaymentCard,
  EvidenceModal: AdminEvidenceModal,
};
