export const paymentLabels = ['第一次支付', '第二次支付', '第三次支付', '第四次支付', '第五次支付', '第六次支付']

export function toNumber(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

export function normalizeProject(project = {}) {
  const payments = paymentLabels.map((label, index) => ({
    label,
    paymentYear: project.payments?.[index]?.paymentYear || '',
    date: project.payments?.[index]?.date || '',
    amount: toNumber(project.payments?.[index]?.amount)
  }))
  const accumulatedPaymentAmount = payments.reduce((sum, item) => sum + toNumber(item.amount), 0)
  const finalAccountAmount = toNumber(project.finalAccountAmount)
  const bidContractAmount = toNumber(project.bidContractAmount || project.winningOrContractAmount)
  const basisAmount = finalAccountAmount || bidContractAmount
  const unpaidAmount = Math.max(basisAmount - accumulatedPaymentAmount, 0)
  const paymentProgress = finalAccountAmount > 0 ? accumulatedPaymentAmount / finalAccountAmount : 0
  const subsidyUnreceived = Math.max(toNumber(project.subsidyReceivable) - toNumber(project.subsidyReceived), toNumber(project.subsidyUnreceived), 0)
  const differenceAmount = toNumber(project.superiorSubsidySource) + toNumber(project.townFundSource) - toNumber(project.townBudget2024)

  return {
    ...project,
    payments,
    accumulatedPaymentAmount,
    unpaidAmount,
    paymentProgress,
    subsidyUnreceived,
    differenceAmount,
    paymentCompleted: unpaidAmount <= 0 && finalAccountAmount > 0 ? '完成' : project.paymentCompleted || '进行中'
  }
}
