const ADMIN_ROLES = ['admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst']

const scopeToSacco = (req, res, next) => {
  if (!req.user) return next()
  if (ADMIN_ROLES.includes(req.user.role)) {
    req.scopeFilter = {}
  } else if (req.user.saccoOperator) {
    req.scopeFilter = { saccoOperator: req.user.saccoOperator }
  } else {
    req.scopeFilter = {}
  }
  next()
}

module.exports = scopeToSacco
