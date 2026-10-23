const orderStatusLabels = {
  awaiting_payment: 'Payment pending',
  awaiting_seller_confirmation: 'Payment claimed',
  handover_pending: 'Handover pending',
  confirmed_cod: 'COD at handover',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  payment_issue: 'Payment issue',
  returned: 'Returned',
}

const paymentStatusLabels = {
  pending: 'Pending',
  awaiting_payment: 'Pending',
  buyer_claimed: 'Claimed',
  awaiting_seller_confirmation: 'Claimed',
  paid: 'Successful',
  payment_not_received: 'Not confirmed',
  cancelled: 'Cancelled',
}

export const getOrderStatusLabel = (status) => orderStatusLabels[String(status || '').toLowerCase()] || 'Pending'
export const getPaymentStatusLabel = (status) => paymentStatusLabels[String(status || '').toLowerCase()] || String(status || 'Pending')
