import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ShopOperationalStatus } from '@localite/shared';
import { api } from '../services/api';

export function useMyShop() {
  const [shop, setShop] = useState(null);
  const [invitedShop, setInvitedShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ shops }, inviteRes] = await Promise.all([
        api.getMyShopApplication(),
        api.getMyInvitations().catch(() => ({ shops: [] })),
      ]);

      setInvitedShop(inviteRes.shops?.[0] || null);

      const approved = shops?.find(
        (s) => s.status === 'approved' && s.operationalStatus === ShopOperationalStatus.ENABLED,
      );
      const pendingApproved = shops?.find((s) => s.status === 'approved');
      setShop(approved || pendingApproved || null);
    } catch (err) {
      console.error(err);
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    shop,
    shopId: shop?.id || null,
    invitedShop,
    loading,
    reload: load,
    isEnabled: shop?.operationalStatus === ShopOperationalStatus.ENABLED,
  };
}
