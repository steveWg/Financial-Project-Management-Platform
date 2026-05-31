import { describe, expect, test } from 'vitest'
import { normalizeProject, paymentLabels } from '../services/projectNormalizer.js'

describe('normalizeProject', () => {
  test('fills six payment slots and recalculates derived financial fields', () => {
    const project = normalizeProject({
      finalAccountAmount: 1000,
      bidContractAmount: 1200,
      subsidyReceivable: 300,
      subsidyReceived: 120,
      superiorSubsidySource: 180,
      townFundSource: 100,
      townBudget2024: 250,
      payments: [
        { paymentYear: 2024, date: '2024-01-10', amount: 200 },
        { paymentYear: 2024, date: '2024-03-12', amount: 250 }
      ]
    })

    expect(project.payments).toHaveLength(6)
    expect(project.payments.map((item) => item.label)).toEqual(paymentLabels)
    expect(project.accumulatedPaymentAmount).toBe(450)
    expect(project.unpaidAmount).toBe(550)
    expect(project.paymentProgress).toBe(0.45)
    expect(project.subsidyUnreceived).toBe(180)
    expect(project.differenceAmount).toBe(30)
    expect(project.paymentCompleted).toBe('进行中')
  })

  test('marks payment completed when final amount is fully paid', () => {
    const project = normalizeProject({
      finalAccountAmount: 500,
      payments: [{ amount: 500 }]
    })

    expect(project.unpaidAmount).toBe(0)
    expect(project.paymentCompleted).toBe('完成')
  })
})
