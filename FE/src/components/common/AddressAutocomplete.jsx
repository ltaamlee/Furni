import { useEffect, useRef, useState } from "react";

const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onPlaceSelect,
  placeholder = "Nhập địa chỉ...",
  className = "",
  required = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEOAPIFY_KEY || 'demo';
      
      const params = new URLSearchParams({
        text: query,
        apiKey: apiKey,
        format: 'json',
        filter: 'countrycode:vn', // Chỉ tìm địa chỉ tại Việt Nam
        type: 'amenity,building,street,postalcode,city,state'
      });

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const formatted = data.results.slice(0, 5).map(item => ({
          address: item.address_line1 || item.formatted,
          city: item.city || item.county || item.state || '',
          district: item.state || '',
          ward: item. suburb || item.locality || '',
          postalCode: item.postcode || '',
          formatted: formatFullAddress(item),
          lat: item.lat,
          lon: item.lon,
          placeId: item.place_id
        }));
        setSuggestions(formatted);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Autocomplete error:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFullAddress = (item) => {
    const parts = [];
    if (item.address_line1) parts.push(item.address_line1);
    if (item.city) parts.push(item.city);
    if (item.state && item.state !== item.city) parts.push(item.state);
    if (item.postcode) parts.push(item.postcode);
    return parts.join(', ');
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    onChange(query);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion.address);
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (onPlaceSelect) {
      onPlaceSelect({
        street: suggestion.address,
        ward: suggestion.ward,
        district: suggestion.city || suggestion.district,
        city: suggestion.district,
        postalCode: suggestion.postalCode,
        fullAddress: suggestion.formatted,
        lat: suggestion.lat,
        lon: suggestion.lon,
        placeId: suggestion.placeId
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className={className}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#D5C9BC] border-t-[#B86B05] rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-[#D5C9BC] rounded-xl shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-3 cursor-pointer hover:bg-[#FAF7F4] transition-colors border-b border-[#EDE8E0] last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-[#A8896A] flex-shrink-0 mt-0.5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[#1C1108]">{suggestion.address}</p>
                  <p className="text-xs text-[#A8896A]">{suggestion.formatted}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
