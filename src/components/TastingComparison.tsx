import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Wine } from 'lucide-react';
import { getSlidersForWineType } from '@/lib/tastingSliderConfig';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Legend,
} from 'recharts';

const WINE_TYPE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Rouge', color: 'hsl(351, 61%, 26%)' },
  2: { label: 'Blanc', color: 'hsl(45, 69%, 47%)' },
  5: { label: 'Rosé', color: 'hsl(340, 80%, 75%)' },
  8: { label: 'Effervescent', color: 'hsl(210, 15%, 85%)' },
  7: { label: 'Autre', color: 'hsl(0, 0%, 60%)' },
};

interface TastingComparisonProps {
  myUserId: string;
  myName: string;
  friendUserId: string;
  friendName: string;
}

interface UserRadarData {
  radarByType: Record<number, { slot1: number[]; slot2: number[]; slot3: number[]; slot4: number[] }>;
  availableTypes: number[];
}

async function fetchUserRadar(userId: string): Promise<UserRadarData> {
  const { data: notices } = await supabase
    .from('user_wine_notice' as any)
    .select('details, wine_id')
    .eq('user_id', userId);

  if (!notices || notices.length === 0) return { radarByType: {}, availableTypes: [] };

  const wineIds = [...new Set((notices as any[]).map(n => n.wine_id))];
  const { data: wines } = await supabase
    .from('wine')
    .select('id, type')
    .in('id', wineIds);

  const winesMap = new Map((wines || []).map(w => [w.id, w.type || 7]));

  const radarByType: Record<number, { slot1: number[]; slot2: number[]; slot3: number[]; slot4: number[] }> = {};
  (notices as any[]).forEach(n => {
    const type = winesMap.get(n.wine_id) || 7;
    if (!radarByType[type]) radarByType[type] = { slot1: [], slot2: [], slot3: [], slot4: [] };
    if (n.details) {
      if (typeof n.details.slot1 === 'number') radarByType[type].slot1.push(n.details.slot1);
      if (typeof n.details.slot2 === 'number') radarByType[type].slot2.push(n.details.slot2);
      if (typeof n.details.slot3 === 'number') radarByType[type].slot3.push(n.details.slot3);
      if (typeof n.details.slot4 === 'number') radarByType[type].slot4.push(n.details.slot4);
    }
  });

  return { radarByType, availableTypes: Object.keys(radarByType).map(Number) };
}

const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

export const TastingComparison = ({ myUserId, myName, friendUserId, friendName }: TastingComparisonProps) => {
  const [myData, setMyData] = useState<UserRadarData | null>(null);
  const [friendData, setFriendData] = useState<UserRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [my, friend] = await Promise.all([
        fetchUserRadar(myUserId),
        fetchUserRadar(friendUserId),
      ]);
      setMyData(my);
      setFriendData(friend);
      
      // Find common types
      const commonTypes = my.availableTypes.filter(t => friend.availableTypes.includes(t));
      if (commonTypes.length > 0) {
        setSelectedType(String(commonTypes[0]));
      } else if (my.availableTypes.length > 0) {
        setSelectedType(String(my.availableTypes[0]));
      }
      setLoading(false);
    };
    load();
  }, [myUserId, friendUserId]);

  const commonTypes = useMemo(() => {
    if (!myData || !friendData) return [];
    const all = new Set([...myData.availableTypes, ...friendData.availableTypes]);
    return Array.from(all);
  }, [myData, friendData]);

  const chartData = useMemo(() => {
    if (!myData || !friendData || !selectedType) return [];
    const typeId = Number(selectedType);
    const sliders = getSlidersForWineType(typeId);
    const mySlots = myData.radarByType[typeId];
    const friendSlots = friendData.radarByType[typeId];

    return [
      {
        axis: sliders.slot1.label,
        [myName]: mySlots ? avg(mySlots.slot1) : 0,
        [friendName]: friendSlots ? avg(friendSlots.slot1) : 0,
      },
      {
        axis: sliders.slot2.label,
        [myName]: mySlots ? avg(mySlots.slot2) : 0,
        [friendName]: friendSlots ? avg(friendSlots.slot2) : 0,
      },
      {
        axis: sliders.slot3.label,
        [myName]: mySlots ? avg(mySlots.slot3) : 0,
        [friendName]: friendSlots ? avg(friendSlots.slot3) : 0,
      },
      {
        axis: sliders.slot4.label,
        [myName]: mySlots ? avg(mySlots.slot4) : 0,
        [friendName]: friendSlots ? avg(friendSlots.slot4) : 0,
      },
    ];
  }, [myData, friendData, selectedType, myName, friendName]);

  if (loading) {
    return <Skeleton className="h-80 rounded-lg" />;
  }

  if (!myData || !friendData || commonTypes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Wine className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Pas assez de données de dégustation pour comparer</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">Comparaison des palais</CardTitle>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {commonTypes.map(type => (
              <SelectItem key={type} value={String(type)}>
                {WINE_TYPE_MAP[type]?.label || 'Autre'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="70%">
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
              name={myName}
              dataKey={myName}
              stroke="hsl(351, 61%, 26%)"
              fill="hsl(351, 61%, 26%)"
              fillOpacity={0.2}
            />
            <Radar
              name={friendName}
              dataKey={friendName}
              stroke="hsl(45, 69%, 47%)"
              fill="hsl(45, 69%, 47%)"
              fillOpacity={0.2}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
