const TODAY = '2026-05-31'

const amount = (value) => Number(value || 0)

export function buildWarnings(projects) {
  return projects.flatMap((project) => {
    const warnings = []

    if (amount(project.unpaidAmount) > 0 && ['进行中', '未完成'].includes(project.projectProgress)) {
      warnings.push(createWarning(project, '未拨付预警', '高', `未拨付金额为 ${formatAmount(project.unpaidAmount)}，项目进度为${project.projectProgress}。`))
    }

    if (amount(project.paymentProgress) > 0 && amount(project.paymentProgress) < 0.9) {
      warnings.push(createWarning(project, '拨款进度预警', '中', `拨款进度 ${(amount(project.paymentProgress) * 100).toFixed(2)}%，低于 90%。`))
    }

    if (amount(project.subsidyUnreceived) > 0) {
      warnings.push(createWarning(project, '补贴未到位预警', amount(project.subsidyUnreceived) > 100000 ? '高' : '中', `未到位补贴为 ${formatAmount(project.subsidyUnreceived)}。`))
    }

    if (amount(project.contractChangeAmount) !== 0 || Math.abs(amount(project.adjustmentRate)) >= 0.05) {
      warnings.push(createWarning(project, '合同变更预警', Math.abs(amount(project.adjustmentRate)) >= 0.1 ? '高' : '中', `合同变更价 ${formatAmount(project.contractChangeAmount)}，调减/调增率 ${(amount(project.adjustmentRate) * 100).toFixed(2)}%。`))
    }

    const missingFields = [
      ['建设主体单位', project.constructionUnit],
      ['子项目名称', project.subProjectName],
      ['年份', project.year],
      ['资金来源', project.fundSource],
      ['中标/合同价', project.bidContractAmount || project.winningOrContractAmount],
      ['竣工决算价', project.finalAccountAmount]
    ].filter(([, value]) => value === '' || value === null || value === undefined || value === 0)

    if (missingFields.length) {
      warnings.push(createWarning(project, '数据缺失预警', '低', `缺失关键字段：${missingFields.map(([label]) => label).join('、')}。`))
    }

    return warnings
  })
}

function createWarning(project, type, level, reason) {
  return {
    id: `${project.id}-${type}`,
    type,
    level,
    projectId: project.id,
    projectName: project.subProjectName,
    targetName: project.subProjectName,
    targetType: '项目台账',
    constructionUnit: project.constructionUnit,
    year: project.year,
    reason,
    createdAt: TODAY,
    status: '待处理',
    handler: '',
    note: ''
  }
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 })
}
