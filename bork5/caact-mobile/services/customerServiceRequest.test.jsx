import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import CustomerServicesScreen from '../app/customer/services';
import { customerServiceChoices } from './customerServiceChoices';
import { createWarrantyClaim, fetchServiceCatalog } from './api';
import { createServiceRequest } from './serviceRequestStorage';
import { getUnitsByUser } from './unitStorage';
import { notifyNotificationsChanged } from './notificationEvents';

let mockParams;
jest.mock('expo-router', () => ({ useRouter: () => ({push:jest.fn()}), useLocalSearchParams: () => mockParams, useFocusEffect: cb => require('react').useEffect(cb, [cb]) }));
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ current: {id:'customer',name:'Customer',phone:'09123456789',addresses:[{isDefault:true,phone:'09123456789',street:'Test address',city:'Bacoor'}]} }) }));
jest.mock('./api', () => ({getStoredToken:jest.fn(async () => 'token'),fetchServiceCatalog:jest.fn(),createWarrantyClaim:jest.fn()}));
jest.mock('./unitStorage', () => ({getUnitsByUser:jest.fn(),cacheUnitUpdate:jest.fn(async () => {})}));
jest.mock('./serviceRequestStorage', () => ({createServiceRequest:jest.fn()}));
jest.mock('./customerHistoryService', () => ({getCustomerServiceHistory:jest.fn(async () => ({requests:[]}))}));
jest.mock('../components/customer/CustomerScreen', () => ({children,stickyAction}) => {const {View}=require('react-native');return <View>{children}{stickyAction}</View>;});
jest.mock('../components/ui/BottomSheetSelect', () => ({label,value,items,getLabel,onSelect}) => {const {View,Text,Pressable}=require('react-native');return <View><Text testID={label}>{value}</Text>{items.map((item,i)=><Pressable key={i} accessibilityLabel={`${label}: ${getLabel(item)}`} onPress={()=>onSelect(item)}><Text>{getLabel(item)}</Text></Pressable>)}</View>;});
jest.mock('../components/ui/CalendarDatePicker', () => ({__esModule:true,default:({onChange})=>{const {Pressable,Text}=require('react-native');return <Pressable onPress={()=>onChange('2099-01-01')}><Text>Choose test date</Text></Pressable>;},getTodayDateKey:()=> '2026-09-10',isPastCalendarDate:()=>false}));

const units = [{id:'ac1',unitName:'First AC',serialNumber:'S1',warrantyStatus:'active',warranty:{claims:[]}}, {id:'ac2',unitName:'Second AC',serialNumber:'S2',warrantyStatus:'expired',warranty:{claims:[]}}];
const offerings = [{id:'delivery',title:'Delivery'}, {id:'installation',title:'Installation'}, {id:'maintenance',title:'Maintenance',pricing:{basePrice:800,label:'PHP 800.00'}}, {id:'cleaning',title:'Cleaning',pricing:{basePrice:1500,label:'PHP 1,500.00'}}, {id:'repair',title:'Repair'}];
beforeEach(()=>{
 jest.clearAllMocks(); mockParams={};
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 getUnitsByUser.mockResolvedValue(units);
 fetchServiceCatalog.mockResolvedValue({success:true,offerings});
 createWarrantyClaim.mockResolvedValue({success:true,warranty:{status:'active',claims:[{status:'submitted'}]}});
 createServiceRequest.mockResolvedValue({id:'request',unitId:'ac1',status:'Submitted'});
});
afterEach(()=>jest.restoreAllMocks());

test('old catalogues show separate cleaning choices without losing prices or exposing order services', ()=>{
 const choices=customerServiceChoices(offerings);
 expect(choices.map(item=>item.title)).toEqual(['Regular Cleaning','Deep Cleaning','Repair']);
 expect(choices[0].pricing.basePrice).toBe(800);
 expect(choices[1].pricing.basePrice).toBe(1500);
});

test('warranty deep link submits a claim, not a dated paid service request', async()=>{
 mockParams={unitId:'ac1',serviceType:'warranty'};
 await render(<CustomerServicesScreen/>);
 await screen.findByText('Submit Warranty Claim');
 expect(screen.queryByText('Choose test date')).toBeNull();
 await fireEvent.changeText(screen.getByLabelText('AC problem'),'AC does not cool');
 await fireEvent.press(screen.getByText('Submit Warranty Claim'));
 await screen.findByText('Warranty Claim in Progress');
 expect(createWarrantyClaim).toHaveBeenCalledWith('token','ac1',{issue:'AC does not cool',notes:''});
 expect(createServiceRequest).not.toHaveBeenCalled();
});

test('expired coverage does not fall through to a standard booking',async()=>{
 mockParams={unitId:'ac2',serviceType:'warranty'};
 await render(<CustomerServicesScreen/>);
 await screen.findByText(/This AC does not currently have active warranty coverage/);
 await fireEvent.changeText(screen.getByLabelText('AC problem'),'AC fault');
 await fireEvent.press(screen.getByText('Submit Warranty Claim'));
 expect(createWarrantyClaim).not.toHaveBeenCalled();
 expect(createServiceRequest).not.toHaveBeenCalled();
});

test.each([['maintenance','Regular Cleaning'],['cleaning','Deep Cleaning']])('%s books the matching service and configured price',async(id,title)=>{
 await render(<CustomerServicesScreen/>);
 await screen.findByText('Submit Service Request');
 await screen.findByLabelText(`Service: ${title}`);
 expect(screen.queryByLabelText('Service: Delivery')).toBeNull();
 expect(screen.queryByLabelText('Service: Installation')).toBeNull();
 await fireEvent.press(screen.getByLabelText(`Service: ${title}`));
 await fireEvent.press(screen.getByText('Choose test date'));
 await fireEvent.changeText(screen.getByLabelText('Service Concern'),'Please clean my AC');
 await fireEvent.press(screen.getByText('Submit Service Request'));
 await screen.findByText('Request Already Open');
 expect(createServiceRequest).toHaveBeenCalledWith(expect.objectContaining({unitId:'ac1',serviceId:id,serviceType:title,issueType:title,preferredDate:'2099-01-01'}));
 expect(createWarrantyClaim).not.toHaveBeenCalled();
});

test('background updates preserve the unit and request type the customer selected',async()=>{
 mockParams={unitId:'ac1',serviceType:'warranty'};
 await render(<CustomerServicesScreen/>);
 await screen.findByText('Submit Warranty Claim');
 await fireEvent.press(screen.getByLabelText('Request type: Cleaning or Service'));
 await fireEvent.press(screen.getByLabelText('Select AC Unit: Second AC · S2'));
 await act(async()=>notifyNotificationsChanged());
 expect(screen.getByTestId('Select AC Unit').props.children).toBe('Second AC');
 expect(screen.getByTestId('Request type').props.children).toBe('Cleaning or Service');
});
