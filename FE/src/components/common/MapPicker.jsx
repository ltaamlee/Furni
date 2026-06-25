import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import mapvinaGL from "mapvina-gl";
import "mapvina-gl/dist/mapvina-gl.css";
import { getProvincesApi, getWardsApi, getWardsByProvinceApi } from "../../utils/api";

const MAPVINA_STYLE = (key) =>
  `https://maps.mapvina.com/styles/v2/streets.json?key=${key}`;
const API_BASE = "https://maps.mapvina.com/api/v2";

const defaultCenter = { lat: 10.8231, lng: 106.6297 }; // Ho Chi Minh

const MapPicker = ({ value = {}, onChange = () => {}, apiKey }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: value.fullName || "",
    phone: value.phone || "",
    provinceCode: value.provinceCode || null,
    provinceName: value.provinceName || "",
    districtCode: value.districtCode || null,
    districtName: value.districtName || "",
    wardCode: value.wardCode || null,
    wardName: value.wardName || "",
    street: value.street || "",
    lat: value.lat || null,
    lng: value.lng || null,
    formattedAddress: value.formattedAddress || "",
    isDefault: value.isDefault || false,
  });

  // Map position
  const [markerPos, setMarkerPos] = useState(
    value.lat && value.lng
      ? [Number(value.lng), Number(value.lat)] // [lng, lat] for mapvinagl
      : [defaultCenter.lng, defaultCenter.lat]
  );

  // Autocomplete
  const [searchQuery, setSearchQuery] = useState(value.street || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const debounceRef = useRef(null);
  const suggestionRef = useRef(null);

  // Administrative divisions
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Load provinces
  useEffect(() => {
    fetchProvinces();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !apiKey || apiKey === "YOUR_GOOGLE_MAPS_KEY_HERE") return;

    try {
      const map = new mapvinaGL.Map({
        container: mapContainerRef.current,
        style: MAPVINA_STYLE(apiKey),
        center: markerPos,
        zoom: value.lat ? 16 : 13,
        maxZoom: 18,
        minZoom: 5,
      });

      mapRef.current = map;

      map.on("load", () => {
        setMapLoaded(true);

        // Add draggable marker
        const marker = new mapvinaGL.Marker({ draggable: true })
          .setLngLat(markerPos)
          .addTo(map);

        markerRef.current = marker;

        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          setMarkerPos([lngLat.lng, lngLat.lat]);
          reverseGeocode(lngLat.lat, lngLat.lng);
        });
      });

      map.on("click", (e) => {
        const lngLat = e.lngLat;
        markerRef.current.setLngLat(lngLat);
        setMarkerPos([lngLat.lng, lngLat.lat]);
        reverseGeocode(lngLat.lat, lngLat.lng);
      });

      map.on("error", () => {
        setMapError(true);
      });
    } catch {
      setMapError(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [apiKey]);

  // Cascade fill: province matched → fetch wards → match ward
  useEffect(() => {
    if (!reverseLoading && provinces.length > 0) {
      if (formData._provinceNamePending) {
        const matched = provinces.find(
          (p) => p.name.toLowerCase() === formData._provinceNamePending.toLowerCase()
        );
        if (matched) {
          setFormData((f) => ({ ...f, provinceCode: matched.code, provinceName: matched.name, _provinceNamePending: undefined }));
          fetchWardsByProvince(matched.code);
        } else {
          setFormData((f) => ({ ...f, provinceName: formData._provinceNamePending, _provinceNamePending: undefined }));
        }
      }
    }
  }, [provinces, reverseLoading]);

  // Cascade fill: wards loaded → match ward name
  useEffect(() => {
    if (!reverseLoading && wards.length > 0) {
      if (formData._wardNamePending) {
        const matched = wards.find(
          (w) => w.name.toLowerCase() === formData._wardNamePending.toLowerCase()
        );
        if (matched) {
          setFormData((f) => ({ ...f, wardCode: matched.code, wardName: matched.name, _wardNamePending: undefined }));
        } else {
          setFormData((f) => ({ ...f, wardName: formData._wardNamePending, _wardNamePending: undefined }));
        }
      }
    }
  }, [wards, reverseLoading]);
  useEffect(() => {
    if (!markerRef.current || !value.lat || !value.lng) return;
    const newPos = [Number(value.lng), Number(value.lat)];
    markerRef.current.setLngLat(newPos);
    setMarkerPos(newPos);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: newPos, zoom: 17 });
    }
  }, [value.lat, value.lng]);

  const fetchProvinces = async () => {
    try {
      setLoadingProvinces(true);
      const res = await getProvincesApi();
      if (res.success) setProvinces(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching provinces:", err);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchWardsByProvince = async (provinceCode) => {
    try {
      setLoadingWards(true);
      const res = await getWardsByProvinceApi(provinceCode);
      if (res.success) setWards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching wards by province:", err);
    } finally {
      setLoadingWards(false);
    }
  };

  const handleFieldChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    onChange(updated);
  };

  const handleProvinceChange = (provinceCode) => {
    const province = provinces.find(
      (p) => String(p.code) === String(provinceCode)
    );
    const updated = {
      ...formData,
      provinceCode: province ? province.code : null,
      provinceName: province?.name || "",
      wardCode: null,
      wardName: "",
    };
    setFormData(updated);
    setWards([]);
    onChange(updated);
    if (provinceCode) {
      fetchWardsByProvince(provinceCode);
      flyToAddress(province?.name, null, null);
    }
  };

  const handleWardChange = (wardCode) => {
    const ward = wards.find((w) => String(w.code) === String(wardCode));
    const updated = {
      ...formData,
      wardCode: ward ? ward.code : null,
      wardName: ward?.name || "",
    };
    setFormData(updated);
    onChange(updated);
    if (wardCode) {
      flyToAddress(formData.provinceName, null, ward?.name);
    }
  };

  const flyToAddress = useCallback(async (provinceName, districtName, wardName) => {
    try {
      const key = apiKey && apiKey !== "YOUR_GOOGLE_MAPS_KEY_HERE" ? apiKey : "public_key";
      const parts = [wardName, districtName, provinceName].filter(Boolean);
      const query = parts.join(", ");
      const params = new URLSearchParams({ address: query, key });
      const res = await fetch(`${API_BASE}/geocode/json?${params.toString()}`);
      const data = await res.json();
      if (data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        const newPos = [lng, lat];
        setMarkerPos(newPos);
        if (markerRef.current) markerRef.current.setLngLat(newPos);
        if (mapRef.current) mapRef.current.flyTo({ center: newPos, zoom: wardName ? 16 : districtName ? 13 : 10, duration: 1200 });
      }
    } catch (err) {
      console.error("Fly to address error:", err);
    }
  }, [apiKey]);
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const key = apiKey && apiKey !== "YOUR_GOOGLE_MAPS_KEY_HERE" ? apiKey : "public_key";
      const params = new URLSearchParams({
        input: query,
        key,
        size: "5",
        new_admin: "true",
        include_old_admin: "true",
      });
      const res = await fetch(
        `${API_BASE}/place/autocomplete/json?${params.toString()}`
      );
      const data = await res.json();
      if (data.predictions && data.predictions.length > 0) {
        setSuggestions(data.predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Autocomplete error:", err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [apiKey]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    handleFieldChange("street", val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSuggestionSelect = async (prediction) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchQuery(prediction.formatted_address || prediction.description);
    handleFieldChange("street", prediction.formatted_address || prediction.description);

    // Geocode the selected place using MapVina textsearch
    try {
      const key = apiKey && apiKey !== "YOUR_GOOGLE_MAPS_KEY_HERE" ? apiKey : "public_key";
      const params = new URLSearchParams({
        query: prediction.description,
        key,
        new_admin: "true",
        include_old_admin: "true",
      });
      const res = await fetch(
        `${API_BASE}/place/textsearch/json?${params.toString()}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const place = data.results[0];
        const { lat, lng } = place.geometry.location;
        const newPos = [lng, lat];
        setMarkerPos(newPos);

        if (markerRef.current) markerRef.current.setLngLat(newPos);
        if (mapRef.current) mapRef.current.flyTo({ center: newPos, zoom: 17 });

        // Parse address components
        const comps = place.address_components || [];
        let provinceName = "", districtName = "", wardName = "", street = "";
        for (const c of comps) {
          const types = c.types || [];
          if (types.includes("administrative_area_level_1")) provinceName = c.long_name;
          if (types.includes("administrative_area_level_2")) districtName = c.long_name;
          if (types.includes("locality") || types.includes("sublocality")) wardName = c.long_name;
        }
        // Extract street number and route
        const streetNum = comps.find((c) => c.types?.includes("street_number"))?.long_name || "";
        const route = comps.find((c) => c.types?.includes("route"))?.long_name || "";
        street = [streetNum, route].filter(Boolean).join(", ");

        const updated = {
          ...formData,
          street: street || prediction.description,
          formattedAddress: place.formatted_address || prediction.description,
          lat,
          lng,
          provinceCode: null,
          wardCode: null,
          wardName: "",
          _provinceNamePending: provinceName || undefined,
          _wardNamePending: wardName || undefined,
        };
        setFormData(updated);
        setWards([]);
        onChange(updated);

        if (provinceName) {
          const matched = provinces.find(
            (p) => p.name.toLowerCase() === provinceName.toLowerCase()
          );
          if (matched) {
            setFormData((f) => ({ ...f, provinceCode: matched.code, provinceName: matched.name, _provinceNamePending: undefined }));
            fetchWardsByProvince(matched.code);
          } else if (provinces.length > 0) {
            setFormData((f) => ({ ...f, provinceName, _provinceNamePending: provinceName }));
          }
        }
      }
    } catch (err) {
      console.error("Geocode error:", err);
    }
  };

  // Reverse geocode using MapVina
  const reverseGeocode = useCallback(async (lat, lng) => {
    setReverseLoading(true);
    try {
      const key = apiKey && apiKey !== "YOUR_GOOGLE_MAPS_KEY_HERE" ? apiKey : "public_key";
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key,
        result_type: "street_address",
        new_admin: "true",
        include_old_admin: "true",
        size: "5",
        radius: "100",
      });
      const res = await fetch(
        `${API_BASE}/geocode/json?${params.toString()}`
      );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const comps = result.address_components || [];
        let provinceName = "", districtName = "", wardName = "", street = "";
        for (const c of comps) {
          const types = c.types || [];
          if (types.includes("administrative_area_level_1")) provinceName = c.long_name;
          if (types.includes("administrative_area_level_2")) districtName = c.long_name;
          if (types.includes("locality") || types.includes("sublocality")) wardName = c.long_name;
        }
        const streetNum = comps.find((c) => c.types?.includes("street_number"))?.long_name || "";
        const route = comps.find((c) => c.types?.includes("route"))?.long_name || "";
        street = [streetNum, route].filter(Boolean).join(", ");

        // Cascade: clear downstream, set pending names, trigger from top
        const updated = {
          ...formData,
          street: street || formData.street,
          formattedAddress: result.formatted_address || "",
          lat,
          lng,
          provinceCode: null,
          wardCode: null,
          wardName: "",
          _provinceNamePending: provinceName || undefined,
          _wardNamePending: wardName || undefined,
        };
        setFormData(updated);
        setWards([]);
        onChange(updated);
        setSearchQuery(street || result.formatted_address || "");

        if (provinceName) {
          const matched = provinces.find(
            (p) => p.name.toLowerCase() === provinceName.toLowerCase()
          );
          if (matched) {
            setFormData((f) => ({ ...f, provinceCode: matched.code, provinceName: matched.name, _provinceNamePending: undefined }));
            fetchWardsByProvince(matched.code);
          } else if (provinces.length > 0) {
            setFormData((f) => ({ ...f, provinceName, _provinceNamePending: provinceName }));
          }
        }
      }
    } catch (err) {
      console.error("Reverse geocode error:", err);
    } finally {
      setReverseLoading(false);
    }
  }, [apiKey, formData, onChange, provinces, wards]);

  // Click outside to close suggestions
  useEffect(() => {
    const handler = (e) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (mapError || !apiKey || apiKey === "YOUR_GOOGLE_MAPS_KEY_HERE") {
    return (
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        <div className="w-full lg:w-1/2 space-y-4 overflow-y-auto max-h-[520px] pr-1">
          {/* Form fields same as below */}
          <FormFields
            formData={formData}
            provinces={provinces}
            wards={wards}
            loadingProvinces={loadingProvinces}
            loadingWards={loadingWards}
            searchQuery={searchQuery}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            loadingSuggestions={loadingSuggestions}
            reverseLoading={reverseLoading}
            suggestionRef={suggestionRef}
            onFieldChange={handleFieldChange}
            onProvinceChange={handleProvinceChange}
            onWardChange={handleWardChange}
            onSearchChange={handleSearchChange}
            onSuggestionSelect={handleSuggestionSelect}
            setShowSuggestions={setShowSuggestions}
          />
        </div>
        <div className="w-full lg:w-1/2">
          <div className="h-[320px] lg:h-auto lg:min-h-[520px] bg-[#FAF7F4] rounded-xl flex items-center justify-center border border-[#EDE8E0]">
            <div className="text-center p-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#D5C9BC] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-sm font-medium text-[#6B5C4C]">Cần API Key MapVina</p>
              <p className="text-xs text-[#A8896A] mt-1">
                Đăng ký tại mapvina.com để nhận key miễn phí
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* ===== LEFT: Form ===== */}
      <div className="w-full lg:w-1/2 space-y-4 overflow-y-auto max-h-[520px] pr-1">
        <FormFields
          formData={formData}
          provinces={provinces}
          wards={wards}
          loadingProvinces={loadingProvinces}
          loadingWards={loadingWards}
          searchQuery={searchQuery}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          loadingSuggestions={loadingSuggestions}
          reverseLoading={reverseLoading}
          suggestionRef={suggestionRef}
          onFieldChange={handleFieldChange}
          onProvinceChange={handleProvinceChange}
          onWardChange={handleWardChange}
          onSearchChange={handleSearchChange}
          onSuggestionSelect={handleSuggestionSelect}
          setShowSuggestions={setShowSuggestions}
        />
      </div>

      {/* ===== RIGHT: MapVina Map ===== */}
      <div className="w-full lg:w-1/2 h-[320px] lg:h-auto lg:min-h-[520px]">
        {!mapLoaded && (
          <div className="w-full h-full bg-[#FAF7F4] rounded-xl flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin" />
          </div>
        )}
        <div
          ref={mapContainerRef}
          className="w-full h-full rounded-xl overflow-hidden"
          style={{ display: mapLoaded ? "block" : "none" }}
        />
      </div>
    </div>
  );
};

// ===== SearchableCombobox component =====
const SearchableCombobox = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  loading,
  required,
  searchable = true,
  allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) =>
      String(o.name || o.label || o).toLowerCase().includes(q)
    );
  }, [options, query]);

  const selected = options.find(
    (o) => String(o.code || o.value || o) === String(value)
  );

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
        setHighlighted(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlighted >= 0 && filtered[highlighted]) {
          const opt = filtered[highlighted];
          onChange(String(opt.code || opt.value || opt));
          setOpen(false);
          setQuery("");
          setHighlighted(-1);
        }
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        setHighlighted(-1);
        break;
      case "Tab":
        setOpen(false);
        setQuery("");
        setHighlighted(-1);
        break;
    }
  };

  const handleSelect = (opt) => {
    onChange(String(opt.code || opt.value || opt));
    setOpen(false);
    setQuery("");
    setHighlighted(-1);
    inputRef.current?.blur();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setHighlighted(-1);
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-[#1C1108] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        className={`relative ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={open ? query : (selected ? (selected.name || selected.label) : "")}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlighted(-1);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-sm bg-white disabled:opacity-50 pr-8"
          />
          {selected && allowClear && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-[#A8896A] hover:text-[#1C1108] text-xs"
            >
              ✕
            </button>
          )}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin" />
            ) : (
              <svg className={`w-4 h-4 text-[#A8896A] transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>

        {open && (
          <ul
            role="listbox"
            className="absolute z-[100] w-full mt-1 bg-white border border-[#D5C9BC] rounded-xl shadow-xl max-h-52 overflow-auto"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[#A8896A]">Không tìm thấy</li>
            ) : (
              filtered.map((opt, i) => {
                const optVal = String(opt.code || opt.value || opt);
                const optLabel = opt.name || opt.label || opt;
                return (
                  <li
                    key={optVal}
                    role="option"
                    aria-selected={optVal === value}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`px-4 py-3 cursor-pointer transition-colors text-sm ${
                      highlighted === i ? "bg-[#FAF7F4]" : ""
                    } ${optVal === value ? "bg-[#FAF7F4] font-medium text-[#B86B05]" : "text-[#1C1108]"}`}
                  >
                    {optLabel}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

// ===== Inline FormFields component =====
const FormFields = ({
  formData, provinces, wards,
  loadingProvinces, loadingWards,
  searchQuery, suggestions, showSuggestions,
  loadingSuggestions, reverseLoading, suggestionRef,
  onFieldChange, onProvinceChange,
  onWardChange, onSearchChange, onSuggestionSelect,
  setShowSuggestions,
}) => {
  return (
    <>
      {/* Full Name & Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Họ và tên</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => onFieldChange("fullName", e.target.value)}
            className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-sm"
            placeholder="Nguyễn Văn A"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1108] mb-1.5">Số điện thoại</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onFieldChange("phone", e.target.value)}
            className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-sm"
            placeholder="0123456789"
            required
          />
        </div>
      </div>

      {/* Province */}
      <SearchableCombobox
        label="Tỉnh/Thành phố"
        value={formData.provinceCode || ""}
        options={provinces}
        onChange={onProvinceChange}
        placeholder="-- Tìm hoặc chọn Tỉnh/Thành phố --"
        disabled={loadingProvinces}
        loading={loadingProvinces}
        required
      />

      {/* District info */}
      <div className="bg-[#FAF7F4] border border-[#EDE8E0] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-[#6B5C4C]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#A8896A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Đơn vị hành chính cấp quận/huyện không còn áp dụng — chọn trực tiếp Phường/Xã bên dưới</span>
        </div>
      </div>

      {/* Ward */}
      <SearchableCombobox
        label="Phường/Xã"
        value={formData.wardCode || ""}
        options={wards}
        onChange={onWardChange}
        placeholder={
          !formData.provinceCode
            ? "-- Chọn Tỉnh/Thành phố trước --"
            : loadingWards
            ? "Đang tải phường/xã..."
            : "-- Tìm hoặc chọn Phường/Xã --"
        }
        disabled={!formData.provinceCode || loadingWards}
        loading={loadingWards}
        allowClear
      />

    {/* Street with MapVina Autocomplete */}
    <div className="relative" ref={suggestionRef}>
      <label className="block text-sm font-medium text-[#1C1108] mb-1.5">
        Địa chỉ (Số nhà, đường) *{" "}
        {reverseLoading && <span className="text-xs text-[#A8896A] ml-1">↻ đang tìm...</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={onSearchChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="w-full px-4 py-2.5 border border-[#D5C9BC] rounded-xl focus:ring-2 focus:ring-[#B86B05]/20 focus:border-[#B86B05] outline-none transition-all text-sm"
          placeholder="Tìm địa chỉ trên MapVina..."
          autoComplete="off"
        />
        {loadingSuggestions && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin" />
          </div>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-[#D5C9BC] rounded-xl shadow-lg max-h-52 overflow-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => onSuggestionSelect(s)}
              className="px-4 py-3 cursor-pointer hover:bg-[#FAF7F4] transition-colors border-b border-[#EDE8E0] last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#A8896A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[#1C1108]">
                    {s.structured_formatting?.main_text}
                  </p>
                  <p className="text-xs text-[#A8896A]">
                    {s.structured_formatting?.secondary_text}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Set as default */}
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={formData.isDefault}
        onChange={(e) => onFieldChange("isDefault", e.target.checked)}
        className="w-5 h-5 text-[#B86B05] rounded focus:ring-[#B86B05]"
      />
      <span className="text-sm text-[#1C1108]">Đặt làm địa chỉ mặc định</span>
    </label>

    {/* Coordinates display */}
    {formData.lat && formData.lng && (
      <div className="text-xs text-[#A8896A] bg-[#FAF7F4] rounded-lg px-3 py-2">
        📍 {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
        {formData.formattedAddress && (
          <span className="block mt-1">{formData.formattedAddress}</span>
        )}
      </div>
    )}

    {/* Drag hint */}
    <div className="text-xs text-[#A8896A]">
      💡 Kéo marker hoặc click trên bản đồ để chọn vị trí chính xác
    </div>
  </>
  );
};

export default MapPicker;
