import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { notifyNotificationsChanged } from './notificationEvents';
import ReceiptScreen from '../app/customer/receipt/[id]';
import { getOrderById } from './orderStorage';
jest.mock('expo-router',()=>({useLocalSearchParams:()=>({id:'order1'}),useRouter:()=>({back:jest.fn(),replace:jest.fn()}),useFocusEffect:cb=>require('react').useEffect(cb,[cb])}));
jest.mock('./orderStorage',()=>({getOrderById:jest.fn(async()=>({id:'order1',orderCode:'ORD-1',receiptAvailable:true,paymentMethod:'gcash',paymentStatus:'paid',receipt:{receiptNumber:'RCP-1'},items:[]}))}));
jest.mock('../components/boutique',()=>{
  const {View,Text}=require('react-native');
  return {BoutiqueButton:()=>null,BoutiqueCard:View,BoutiqueChip:({label})=><Text>{label}</Text>,BoutiqueHeader:()=>null,BoutiqueScreen:View,BoutiqueText:Text,BQ_COLORS:{},BQ_RADIUS:{},BQ_SHADOW:{},BQ_SPACING:{md:12,lg:16,xl:24}};
});
test('long derived receipt reference is not repeated and contact details are not truncated',async()=>{
 const reference = 'ORD-1788981329646-44S5N1';
 getOrderById.mockResolvedValueOnce({id:'order1',orderCode:reference,receiptAvailable:true,paymentMethod:'gcash',paymentStatus:'paid',invoice:{customer:{name:'Test Customer',email:'long.customer.address@example.com'}},receipt:{receiptNumber:`RCP-${reference}`},items:[]});
 await render(<ReceiptScreen/>);
 expect(await screen.findByText(`RCP-${reference}`)).toBeTruthy();
 expect(screen.queryByText(reference)).toBeNull();
 expect(screen.getByText(`RCP-${reference}`).props.numberOfLines).toBeUndefined();
 expect(screen.getByText(/long.customer.address@example.com/).props.numberOfLines).toBeUndefined();
});
test('mobile receipt shows one receipt identifier and preserves the separate order reference',async()=>{
 await render(<ReceiptScreen/>);
 await screen.findByText(/RCP-1/);
 expect(screen.getAllByText(/RCP-1/)).toHaveLength(1);
 expect(screen.getByText(/ORD-1/)).toBeTruthy();
 expect(screen.getByText('GCash')).toBeTruthy();
 expect(screen.getByLabelText('Cold Air logo')).toBeTruthy();
});

test('receipt updates in place when a payment/delivery notification arrives', async () => {
 const order = {id:'order1',orderCode:'ORD-1',receiptAvailable:true,paymentMethod:'cod',receipt:{receiptNumber:'RCP-1'},items:[],tracking:{currentLabel:'Preparing for delivery'}};
 getOrderById.mockResolvedValueOnce(order);
 await render(<ReceiptScreen/>);
 await screen.findByText('Preparing for delivery');
 getOrderById.mockResolvedValueOnce({...order,codCollection:{collectedAt:'2026-09-10'},tracking:{currentLabel:'Completed'}});
 await act(async () => notifyNotificationsChanged());
 expect(await screen.findByText('Completed')).toBeTruthy();
 expect(screen.queryByText('Preparing for delivery')).toBeNull();
 expect(screen.getByText('PAID ON DELIVERY')).toBeTruthy();
});
