import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ReceiptScreen from '../app/customer/receipt/[id]';
jest.mock('expo-router',()=>({useLocalSearchParams:()=>({id:'order1'}),useRouter:()=>({back:jest.fn(),replace:jest.fn()}),useFocusEffect:cb=>require('react').useEffect(cb,[cb])}));
jest.mock('./orderStorage',()=>({getOrderById:jest.fn(async()=>({id:'order1',orderCode:'ORD-1',receiptAvailable:true,paymentMethod:'gcash',paymentStatus:'paid',receipt:{receiptNumber:'RCP-1'},items:[]}))}));
jest.mock('../components/boutique',()=>{
  const {View,Text}=require('react-native');
  return {BoutiqueButton:()=>null,BoutiqueCard:View,BoutiqueChip:({label})=><Text>{label}</Text>,BoutiqueHeader:()=>null,BoutiqueScreen:View,BoutiqueText:Text,BQ_COLORS:{},BQ_RADIUS:{},BQ_SHADOW:{},BQ_SPACING:{md:12,lg:16,xl:24}};
});
test('mobile receipt shows one receipt identifier and preserves the separate order reference',async()=>{
 await render(<ReceiptScreen/>);
 await screen.findByText(/RCP-1/);
 expect(screen.getAllByText(/RCP-1/)).toHaveLength(1);
 expect(screen.getByText(/ORD-1/)).toBeTruthy();
 expect(screen.getByText('GCash')).toBeTruthy();
 expect(screen.getByLabelText('Cold Air logo')).toBeTruthy();
});
