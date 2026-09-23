import { Employee } from './employee.model.js';
import { Store } from './store.model.js';
import { Shift } from './shift.model.js';
import { Transaction } from './transaction.model.js';
import { User } from './user.model.js';
import { AuditLog } from './audit-log.model.js';
import { TransferRequest } from './transfer-request.model.js';

Store.hasMany(Employee, { foreignKey: 'storeId' });
Employee.belongsTo(Store, { foreignKey: 'storeId' });

Store.belongsTo(Employee, { as: 'manager', foreignKey: 'managerId' });
Employee.hasMany(Store, { as: 'managedStores', foreignKey: 'managerId' });

Employee.hasMany(Shift, { foreignKey: 'employeeId' });
Shift.belongsTo(Employee, { foreignKey: 'employeeId' });
Store.hasMany(Shift, { foreignKey: 'storeId' });
Shift.belongsTo(Store, { foreignKey: 'storeId' });

Employee.hasMany(Transaction, { as: 'employeeTransactions', foreignKey: 'relatedEmployeeId' });
Transaction.belongsTo(Employee, { as: 'relatedEmployee', foreignKey: 'relatedEmployeeId' });
Store.hasMany(Transaction, { foreignKey: 'storeId' });
Transaction.belongsTo(Store, { foreignKey: 'storeId' });

User.belongsTo(Employee, { as: 'profile', foreignKey: 'employeeId' });
User.belongsTo(Store, { foreignKey: 'storeId' });
AuditLog.belongsTo(User, { foreignKey: 'operatorId' });

Employee.hasMany(TransferRequest, { as: 'transferRequests', foreignKey: 'employeeId' });
TransferRequest.belongsTo(Employee, { as: 'employee', foreignKey: 'employeeId' });
TransferRequest.belongsTo(Store, { as: 'targetStore', foreignKey: 'targetStoreId' });
TransferRequest.belongsTo(User, { as: 'applicant', foreignKey: 'applicantId' });
TransferRequest.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewerId' });

export { Employee, Store, Shift, Transaction, User, AuditLog, TransferRequest };
