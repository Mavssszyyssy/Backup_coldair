import React from 'react';
import { View } from 'react-native';
import DetailRow from '../ui/DetailRow';
import { useInterfaceLanguage } from '../../hooks/useInterfaceLanguage';

export default function WarrantyClaimDetails({ claim, formatDate }) {
  const { t } = useInterfaceLanguage();
  return <View>
    <DetailRow label={`${claim.claimId} · ${t(String(claim.status || 'submitted').replace(/_/g, ' '))}`} value={claim.issue || t('Warranty claim')} multiline />
    {claim.decisionNote ? <DetailRow label={t("Branch decision")} value={claim.decisionNote} multiline /> : null}
    {claim.reviewedAt ? <DetailRow label={t("Reviewed on")} value={formatDate(claim.reviewedAt)} /> : null}
    {claim.coveredComponent ? <DetailRow label={t("Approved component")} value={claim.coveredComponent} /> : null}
    {claim.cancellationReason ? <DetailRow label={t("Cancellation reason")} value={claim.cancellationReason} multiline /> : null}
  </View>;
}
