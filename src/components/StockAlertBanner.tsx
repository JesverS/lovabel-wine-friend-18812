import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, X, Wine } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StockAlert {
  id: string;
  cellar_id: string;
  wine_id: string;
  wine_name: string;
  current_quantity: number;
  threshold: number;
  is_read: boolean;
  created_at: string;
}

interface StockAlertBannerProps {
  cellarId: string;
}

export function StockAlertBanner({ cellarId }: StockAlertBannerProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [cellarId]);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('stock_alert' as any)
      .select('*')
      .eq('cellar_id', cellarId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAlerts(data as unknown as StockAlert[]);
    }
    setLoading(false);
  };

  const dismissAlert = async (alertId: string) => {
    // Optimistic update
    setAlerts(prev => prev.filter(a => a.id !== alertId));

    await supabase
      .from('stock_alert' as any)
      .update({ is_read: true })
      .eq('id', alertId);
  };

  const dismissAll = async () => {
    const alertIds = alerts.map(a => a.id);
    setAlerts([]);

    await supabase
      .from('stock_alert' as any)
      .update({ is_read: true })
      .in('id', alertIds);
  };

  if (loading || alerts.length === 0) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-800 dark:text-amber-400">
                Alertes de stock ({alerts.length})
              </h3>
              <ul className="space-y-1.5">
                {alerts.slice(0, 5).map((alert) => (
                  <li key={alert.id} className="flex items-center gap-2 text-sm">
                    <Wine className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <span className="text-foreground">
                      <strong>{alert.wine_name}</strong> : {alert.current_quantity} bouteille{alert.current_quantity > 1 ? 's' : ''} restante{alert.current_quantity > 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
                {alerts.length > 5 && (
                  <li className="text-xs text-muted-foreground">
                    ... et {alerts.length - 5} autre{alerts.length - 5 > 1 ? 's' : ''} alerte{alerts.length - 5 > 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={dismissAll}
            className="flex-shrink-0"
          >
            Tout masquer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
