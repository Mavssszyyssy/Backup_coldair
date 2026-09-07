import React from 'react';
import { View } from 'react-native';
import DetailRow from '../ui/DetailRow';

export default function WarrantyClaimDetails({ claim, formatDate }) {
  return <View>
    <DetailRow label={`${claim.claimId} · ${String(claim.status || 'submitted').replace(/_/g, ' ')}`} value={claim.issue || 'Warranty claim'} multiline />
    {claim.decisionNote ? <DetailRow label="Branch decision" value={claim.decisionNote} multiline /> : null}
    {claim.reviewedAt ? <DetailRow label="Reviewed on" value={formatDate(claim.reviewedAt)} /> : null}
    {claim.coveredComponent ? <DetailRow label="Approved component" value={claim.coveredComponent} /> : null}
    {claim.cancellationReason ? <DetailRow label="Cancellation reason" value={claim.cancellationReason} multiline /> : null}
  </View>;
}
