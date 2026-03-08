import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Wine, Star, ThumbsUp, Globe, Instagram, Share2 } from 'lucide-react';
import { getSlidersForWineType } from '@/lib/tastingSliderConfig';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, Legend,
} from 'recharts';
import { SharePalaisStoryDialog } from './SharePalaisStoryDialog';

const WINE_TYPE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Rouge', color: 'hsl(351, 61%, 26%)' },
  2: { label: 'Blanc', color: 'hsl(45, 69%, 47%)' },
  5: { label: 'Rosé', color: 'hsl(340, 80%, 75%)' },
  8: { label: 'Effervescent', color: 'hsl(210, 15%, 85%)' },
  7: { label: 'Autre', color: 'hsl(0, 0%, 60%)' },
};

interface TastingDashboardProps {
  userId: string;
  userName?: string;
}

interface TastingData {
  id: string;
  created_at: string;
  liked: number;
  rating: number | null;
  details: any;
  wine: {
    id: string;
    name: string;
    type: number | null;
    year: number | null;
    domain_id: string;
  };
  domain: {
    name: string;
    region: string | null;
  };
}

export const TastingDashboard = ({ userId, userName }: TastingDashboardProps) => {
  const [tastings, setTastings] = useState<TastingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRadarType, setSelectedRadarType] = useState<string>('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    fetchAllTastings();
  }, [userId]);

  const fetchAllTastings = async () => {
    setLoading(true);

    // Fetch all notices
    const { data: notices, error } = await supabase
      .from('user_wine_notice' as any)
      .select('id, created_at, liked, rating, details, wine_id')
      .eq('user_id', userId);

    if (error || !notices || notices.length === 0) {
      setTastings([]);
      setLoading(false);
      return;
    }

    const wineIds = [...new Set((notices as any[]).map(n => n.wine_id))];
    const { data: wines } = await supabase
      .from('wine')
      .select('id, name, type, year, domain_id')
      .in('id', wineIds);

    const winesMap = new Map((wines || []).map(w => [w.id, w]));
    const domainIds = [...new Set((wines || []).map(w => w.domain_id).filter(Boolean))];

    const { data: domains } = await supabase
      .from('domain')
      .select('id, name, region')
      .in('id', domainIds);

    const domainsMap = new Map((domains || []).map(d => [d.id, d]));

    const enriched = (notices as any[])
      .map(n => {
        const wine = winesMap.get(n.wine_id);
        if (!wine) return null;
        const domain = domainsMap.get(wine.domain_id);
        return {
          ...n,
          wine,
          domain: domain || { name: 'Inconnu', region: null },
        };
      })
      .filter(Boolean) as TastingData[];

    setTastings(enriched);
    setLoading(false);
  };

  // STATS CALCULATIONS
  const stats = useMemo(() => {
    if (tastings.length === 0) return null;

    const total = tastings.length;
    const likedCount = tastings.filter(t => t.liked === 1).length;
    const dislikedCount = tastings.filter(t => t.liked === -1).length;
    const uniqueDomains = new Set(tastings.map(t => t.wine.domain_id)).size;

    // Average rating from details
    const ratingsFromDetails = tastings
      .map(t => t.details?.rating)
      .filter((r): r is number => typeof r === 'number' && r > 0);
    const avgRating = ratingsFromDetails.length > 0
      ? ratingsFromDetails.reduce((a, b) => a + b, 0) / ratingsFromDetails.length
      : null;

    // Wine type distribution
    const typeDistribution: Record<number, number> = {};
    tastings.forEach(t => {
      const type = t.wine.type || 7;
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    const typeData = Object.entries(typeDistribution)
      .map(([type, count]) => ({
        type: Number(type),
        label: WINE_TYPE_MAP[Number(type)]?.label || 'Autre',
        count,
        fill: WINE_TYPE_MAP[Number(type)]?.color || 'hsl(0, 0%, 60%)',
      }))
      .sort((a, b) => b.count - a.count);

    // Most tasted type for radar default
    const mostTastedType = typeData[0]?.type || 1;

    // Radar: average slots per type
    const radarByType: Record<number, { slot1: number[]; slot2: number[]; slot3: number[]; slot4: number[] }> = {};
    tastings.forEach(t => {
      const type = t.wine.type || 7;
      if (!radarByType[type]) radarByType[type] = { slot1: [], slot2: [], slot3: [], slot4: [] };
      if (t.details) {
        if (typeof t.details.slot1 === 'number') radarByType[type].slot1.push(t.details.slot1);
        if (typeof t.details.slot2 === 'number') radarByType[type].slot2.push(t.details.slot2);
        if (typeof t.details.slot3 === 'number') radarByType[type].slot3.push(t.details.slot3);
        if (typeof t.details.slot4 === 'number') radarByType[type].slot4.push(t.details.slot4);
      }
    });

    // Top regions
    const regionCounts: Record<string, number> = {};
    tastings.forEach(t => {
      const region = t.domain.region || 'Inconnue';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    const topRegions = Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region, count]) => ({ region, count }));

    // Monthly progression (last 12 months)
    const now = new Date();
    const monthlyData: { month: string; count: number; avgRating: number | null }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const monthTastings = tastings.filter(t => {
        const td = new Date(t.created_at);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      });
      const ratings = monthTastings
        .map(t => t.details?.rating)
        .filter((r): r is number => typeof r === 'number' && r > 0);
      monthlyData.push({
        month: label,
        count: monthTastings.length,
        avgRating: ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null,
      });
    }

    return {
      total,
      likedCount,
      dislikedCount,
      uniqueDomains,
      avgRating,
      typeData,
      mostTastedType,
      radarByType,
      topRegions,
      monthlyData,
    };
  }, [tastings]);

  // Set default radar type
  useEffect(() => {
    if (stats && !selectedRadarType) {
      setSelectedRadarType(String(stats.mostTastedType));
    }
  }, [stats, selectedRadarType]);

  const radarData = useMemo(() => {
    if (!stats || !selectedRadarType) return [];
    const typeId = Number(selectedRadarType);
    const data = stats.radarByType[typeId];
    if (!data) return [];

    const sliders = getSlidersForWineType(typeId);
    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    return [
      { axis: sliders.slot1.label, value: avg(data.slot1) },
      { axis: sliders.slot2.label, value: avg(data.slot2) },
      { axis: sliders.slot3.label, value: avg(data.slot3) },
      { axis: sliders.slot4.label, value: avg(data.slot4) },
    ];
  }, [stats, selectedRadarType]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!stats || tastings.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Wine className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune dégustation pour le moment</p>
          <p className="text-sm text-muted-foreground mt-2">
            Commencez à déguster des vins pour voir vos statistiques ici
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableTypes = Object.keys(stats.radarByType).map(Number);

  return (
    <div className="space-y-6">
      {/* Header with share button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mon Palais</h2>
        <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)} className="gap-2">
          <Instagram className="w-4 h-4" />
          Partager
        </Button>
      </div>

      {/* Bloc 1: Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Wine className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Dégustations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold">
              {stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Note moyenne</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">{stats.likedCount}</p>
            <p className="text-xs text-muted-foreground">Vins aimés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{stats.uniqueDomains}</p>
            <p className="text-xs text-muted-foreground">Domaines explorés</p>
          </CardContent>
        </Card>
      </div>

      {/* Bloc 2: Wine type distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Répartition par type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="count" name="Dégustations" radius={[0, 4, 4, 0]}>
                  {stats.typeData.map((entry, idx) => (
                    <rect key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bloc 3: Aromatic radar */}
      {availableTypes.length > 0 && radarData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Profil aromatique moyen</CardTitle>
              <Select value={selectedRadarType} onValueChange={setSelectedRadarType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(type => (
                    <SelectItem key={type} value={String(type)}>
                      {WINE_TYPE_MAP[type]?.label || 'Autre'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 10]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Radar
                    name="Moyenne"
                    dataKey="value"
                    stroke="hsl(351, 61%, 26%)"
                    fill="hsl(351, 61%, 26%)"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bloc 4: Top regions */}
      {stats.topRegions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top régions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topRegions.map((region, idx) => (
                <div key={region.region} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5">{idx + 1}</span>
                    <span className="text-sm font-medium">{region.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(24, (region.count / stats.topRegions[0].count) * 120)}px` }}
                    />
                    <span className="text-sm text-muted-foreground w-8 text-right">{region.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bloc 5: Monthly progression */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progression (12 derniers mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  yAxisId="count"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  yAxisId="rating"
                  orientation="right"
                  domain={[0, 10]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="count"
                  name="Dégustations"
                  stroke="hsl(351, 61%, 26%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="rating"
                  type="monotone"
                  dataKey="avgRating"
                  name="Note moy."
                  stroke="hsl(45, 69%, 47%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Share dialog */}
      <SharePalaisStoryDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        stats={{
          total: stats.total,
          avgRating: stats.avgRating,
          likedCount: stats.likedCount,
          uniqueDomains: stats.uniqueDomains,
          typeData: stats.typeData,
          topRegions: stats.topRegions,
        }}
        userName={userName}
      />
    </div>
  );
};
