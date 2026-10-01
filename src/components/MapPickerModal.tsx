import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Search, Navigation, CheckCircle2, Loader2, MapPin, Crosshair } from 'lucide-react';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  onConfirmLocation: (location: {
    latitude: number;
    longitude: number;
    addressText: string;
  }) => void;
}

// Fix default leaflet marker icon asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Red Marker for Curvada
const customPinIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
      <div style="background-color: #D31F24; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
        <div style="transform: rotate(45deg); color: white; font-weight: 900; font-size: 14px;">📍</div>
      </div>
      <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 50%; filter: blur(1px); margin-top: 2px;"></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

export default function MapPickerModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  onConfirmLocation,
}: MapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default Center: Curvada's Kitchen Dinalupihan, Bataan / Central Luzon
  const defaultLat = initialLat || 14.8812;
  const defaultLng = initialLng || 120.4561;

  const [currentLat, setCurrentLat] = useState<number>(defaultLat);
  const [currentLng, setCurrentLng] = useState<number>(defaultLng);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocatingDevice, setIsLocatingDevice] = useState<boolean>(false);

  // Reverse geocoding function
  const fetchAddressName = async (lat: number, lng: number) => {
    setIsResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.address || {};
          const road = addr.road || addr.pedestrian || addr.suburb || '';
          const village = addr.village || addr.neighbourhood || addr.quarter || addr.suburb || '';
          const city = addr.city || addr.town || addr.municipality || '';
          const state = addr.state || addr.province || '';

          const parts = [road, village, city, state].filter(Boolean);
          const formatted = parts.length > 0 ? parts.join(', ') : data.display_name;
          setResolvedAddress(formatted);
          return formatted;
        }
      }
    } catch (e) {
      console.warn('Reverse geocode failed', e);
    } finally {
      setIsResolving(false);
    }
    return '';
  };

  // Initialize or re-center Map when Modal Opens
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const lat = initialLat || defaultLat;
      const lng = initialLng || defaultLng;

      setCurrentLat(lat);
      setCurrentLng(lng);

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 16,
          zoomControl: false,
        });

        // Add sleek OSM Tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);

        // Add Zoom Control at bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Draggable Custom Marker
        const marker = L.marker([lat, lng], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newLat = Number(pos.lat.toFixed(6));
          const newLng = Number(pos.lng.toFixed(6));
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          fetchAddressName(newLat, newLng);
        });

        // Map Click to Move Pin
        map.on('click', (e) => {
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          fetchAddressName(newLat, newLng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        fetchAddressName(lat, lng);
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([lat, lng], 16);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, initialLat, initialLng]);

  // Handle Search for a Landmark / Town / Street
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const queryWithCountry = searchQuery.toLowerCase().includes('philippines')
        ? searchQuery.trim()
        : `${searchQuery.trim()}, Philippines`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithCountry)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const target = results[0];
          const newLat = parseFloat(target.lat);
          const newLng = parseFloat(target.lon);

          setCurrentLat(newLat);
          setCurrentLng(newLng);
          setResolvedAddress(target.display_name);

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([newLat, newLng], 17);
            markerRef.current.setLatLng([newLat, newLng]);
          }
        } else {
          alert('Location not found. Please try zooming & clicking directly on the map.');
        }
      }
    } catch (e) {
      console.warn('Search geocode failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle GPS Current Device Location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingDevice(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingDevice(false);
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));

        setCurrentLat(newLat);
        setCurrentLng(newLng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 17);
          markerRef.current.setLatLng([newLat, newLng]);
        }
        fetchAddressName(newLat, newLng);
      },
      (err) => {
        setIsLocatingDevice(false);
        alert('Could not access current GPS position. You can pan and drag the pin manually on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    onConfirmLocation({
      latitude: currentLat,
      longitude: currentLng,
      addressText: resolvedAddress,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#141413] border-2 border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[90vh] max-h-[720px]">
        
        {/* Header */}
        <div className="p-4 bg-[#0D0D0C] border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">
                Pin Exact Delivery Location
              </h3>
              <p className="text-gray-400 text-[10px] font-normal">
                Drag the red pin or click on the map to pinpoint your exact doorstep
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Toolbar */}
        <div className="p-3 bg-[#181818] border-b border-white/5 flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <form onSubmit={handleSearch} className="flex-1 flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search street, barangay, or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D0D0C] text-white text-xs pl-9 pr-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-brand-red placeholder:text-gray-600 font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-3.5 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Quick Locate Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocatingDevice}
            className="px-3.5 py-2 rounded-xl bg-[#0D0D0C] hover:bg-white/5 border border-white/10 text-brand-gold text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Jump to Device Location"
          >
            {isLocatingDevice ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-gold" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-brand-gold" />
            )}
            <span>Locate Me</span>
          </button>
        </div>

        {/* Interactive Leaflet Map Canvas */}
        <div className="flex-1 relative bg-[#0D0D0C] overflow-hidden min-h-[250px]">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Map Overlay Floating Instructions */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-[10px] text-white font-semibold flex items-center gap-1.5 shadow-lg pointer-events-none">
            <span>👆 Tap anywhere on the map or drag the pin to place</span>
          </div>
        </div>

        {/* Footer: Resolved Address & Confirmation */}
        <div className="p-4 bg-[#0D0D0C] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="w-full sm:max-w-[65%]">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
              Pinned Address Location:
            </span>
            {isResolving ? (
              <div className="flex items-center gap-1.5 text-xs text-brand-gold font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-gold" />
                <span>Resolving address name...</span>
              </div>
            ) : (
              <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                {resolvedAddress || 'Custom pinned location'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-gold hover:opacity-90 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-brand-gold/10 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>Confirm Pinned Location</span>
          </button>
        </div>

      </div>
    </div>
  );
}
