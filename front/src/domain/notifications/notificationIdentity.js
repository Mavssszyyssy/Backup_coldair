// Alert responses produced by older deployments may still expose Mongo's
// `_id`. Keep click/read behavior stable while the API response is normalized.
export const getNotificationId = (notification = {}) => {
  const value = notification.id || notification._id;
  return value == null ? "" : String(value);
};
