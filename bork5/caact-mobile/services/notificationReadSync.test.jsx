import { markNotificationRead, getNotificationsForUser } from './notificationService';
import * as api from './api';
import { subscribeNotificationChanges } from './notificationEvents';
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('./api',()=>({getStoredToken:jest.fn(async()=>'test'),fetchNotifications:jest.fn(),markNotificationRead:jest.fn()}));
beforeEach(() => jest.clearAllMocks());
test('failed remote read never announces a read-state change',async()=>{
 const changed=jest.fn();const unsubscribe=subscribeNotificationChanges(changed);
 api.markNotificationRead.mockResolvedValue({success:false,error:'Offline'});
 await expect(markNotificationRead('notice1')).rejects.toThrow('Offline');
 expect(changed).not.toHaveBeenCalled();
 api.markNotificationRead.mockResolvedValue({success:true});
 await markNotificationRead('notice1');
 expect(changed).toHaveBeenCalledTimes(1);unsubscribe();
});
test('badge refresh cannot substitute an empty local list after an API failure',async()=>{
 api.fetchNotifications.mockResolvedValue({success:false});
 await expect(getNotificationsForUser({id:'tech1',role:'technician'},{strict:true})).rejects.toThrow();
});
test('customer alerts returned with a legacy _id keep a usable read identifier',async()=>{
 api.fetchNotifications.mockResolvedValue({success:true,notifications:[{
  _id:'customer-alert-1', title:'Your message was received', unread:true,
 }]});
 await expect(getNotificationsForUser({id:'customer1',role:'customer'},{strict:true})).resolves.toMatchObject([
  {id:'customer-alert-1',unread:true},
 ]);
});
test('simultaneous notification surfaces share one backend read',async()=>{
 let release;
 api.fetchNotifications.mockImplementation(() => new Promise(resolve => { release = resolve; }));
 const first = getNotificationsForUser({id:'tech1',role:'technician'},{strict:true});
 const second = getNotificationsForUser({id:'tech1',role:'technician'},{strict:true});
 await Promise.resolve();
 expect(api.fetchNotifications).toHaveBeenCalledTimes(1);
 release({success:true,notifications:[]});
 await expect(Promise.all([first,second])).resolves.toEqual([[],[]]);
});
