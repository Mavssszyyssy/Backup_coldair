import { markNotificationRead, getNotificationsForUser, archiveNotificationForUser } from './notificationService';
import * as api from './api';
import { subscribeNotificationChanges } from './notificationEvents';
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('./api',()=>({getStoredToken:jest.fn(async()=>'test'),fetchNotifications:jest.fn(),markNotificationRead:jest.fn(),archiveNotification:jest.fn()}));
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
test('mobile alert page exposes more results without changing badge reads', async()=>{
 api.fetchNotifications.mockResolvedValue({success:true,notifications:[{id:'n1',title:'Update'}],hasMore:true});
 await expect(getNotificationsForUser({id:'customer1',role:'customer'},{strict:true,limit:30,withMetadata:true})).resolves.toMatchObject({items:[{id:'n1'}],hasMore:true});
 expect(api.fetchNotifications).toHaveBeenCalledWith('test',{limit:30});
});
test('archive failure keeps the alert visible', async()=>{
 api.archiveNotification.mockResolvedValue({success:false,error:'Offline'});
 await expect(archiveNotificationForUser('n1')).rejects.toThrow('Offline');
});

test('an inbox refresh started before archiving cannot bring the archived alert back', async () => {
  let finishOldRead;
  api.fetchNotifications
    .mockImplementationOnce(() => new Promise(resolve => { finishOldRead = resolve; }))
    .mockResolvedValueOnce({ success: true, notifications: [{ id: 'other' }, { id: 'n1', archivedAt: '2026-11-11' }] });
  api.archiveNotification.mockResolvedValue({ success: true });
  const refresh = getNotificationsForUser({ id: 'tech1', role: 'technician' }, { strict: true, limit: 30, withMetadata: true });
  await Promise.resolve();
  await archiveNotificationForUser('n1');
  finishOldRead({ success: true, notifications: [{ id: 'n1' }] });
  await expect(refresh).resolves.toMatchObject({ items: [{ id: 'other' }] });
  expect(api.fetchNotifications).toHaveBeenCalledTimes(2);
});
