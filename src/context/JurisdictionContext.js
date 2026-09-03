import React, { createContext, useContext, useState, useEffect } from 'react';

const JurisdictionContext = createContext();

export const useJurisdiction = () => {
  const context = useContext(JurisdictionContext);
  if (!context) {
    throw new Error('useJurisdiction must be used within a JurisdictionProvider');
  }
  return context;
};

export const JurisdictionProvider = ({ children }) => {
  const [jurisdictionData, setJurisdictionData] = useState(null);
  const [currentJurisdiction, setCurrentJurisdiction] = useState(null);

  useEffect(() => {
    loadJurisdictionData();
  }, []);

  const loadJurisdictionData = () => {
    // Mock Texas jurisdiction data - in a real app, this would come from Texas GIS data
    const data = {
      cities: [
        {
          name: "Austin",
          bounds: { 
            minLat: 30.1, maxLat: 30.5, 
            minLng: -97.9, maxLng: -97.6 
          },
          agency: {
            name: "Austin Police Department",
            type: "City Police",
            phone: "(512) 974-5000",
            emergencyPhone: "911",
            address: "715 E 8th St, Austin, TX 78701",
            website: "https://www.austintexas.gov/department/police",
            nonEmergencyReporting: "https://www.austintexas.gov/page/file-police-report-online"
          }
        },
        {
          name: "Houston",
          bounds: { 
            minLat: 29.5, maxLat: 30.1, 
            minLng: -95.8, maxLng: -95.0 
          },
          agency: {
            name: "Houston Police Department",
            type: "City Police",
            phone: "(713) 884-3131",
            emergencyPhone: "911",
            address: "1200 Travis St, Houston, TX 77002",
            website: "https://www.houstontx.gov/police/",
            nonEmergencyReporting: "https://www.houstontx.gov/police/online_report.htm"
          }
        },
        {
          name: "Dallas",
          bounds: { 
            minLat: 32.6, maxLat: 33.0, 
            minLng: -96.9, maxLng: -96.6 
          },
          agency: {
            name: "Dallas Police Department",
            type: "City Police",
            phone: "(214) 671-4065",
            emergencyPhone: "911",
            address: "1400 S Lamar St, Dallas, TX 75215",
            website: "https://dallaspolice.net/",
            nonEmergencyReporting: "https://dallaspolice.net/reports/Pages/default.aspx"
          }
        },
        {
          name: "San Antonio",
          bounds: { 
            minLat: 29.2, maxLat: 29.7, 
            minLng: -98.7, maxLng: -98.3 
          },
          agency: {
            name: "San Antonio Police Department",
            type: "City Police",
            phone: "(210) 207-7273",
            emergencyPhone: "911",
            address: "300 E Nueva St, San Antonio, TX 78205",
            website: "https://www.sanantonio.gov/SAPD",
            nonEmergencyReporting: "https://webapp4.sanantonio.gov/sapdonlinereporting/"
          }
        },
        {
          name: "Fort Worth",
          bounds: { 
            minLat: 32.6, maxLat: 32.9, 
            minLng: -97.5, maxLng: -97.1 
          },
          agency: {
            name: "Fort Worth Police Department",
            type: "City Police",
            phone: "(817) 392-4222",
            emergencyPhone: "911",
            address: "350 W Belknap St, Fort Worth, TX 76102",
            website: "https://www.fortworthtexas.gov/departments/police",
            nonEmergencyReporting: "https://www.fortworthtexas.gov/departments/police/report"
          }
        }
      ],
      counties: [
        {
          name: "Travis County",
          bounds: { 
            minLat: 30.0, maxLat: 30.6, 
            minLng: -98.1, maxLng: -97.5 
          },
          agency: {
            name: "Travis County Sheriff's Office",
            type: "County Sheriff",
            phone: "(512) 974-0845",
            emergencyPhone: "911",
            address: "5555 Airport Blvd, Austin, TX 78751",
            website: "https://www.traviscountytx.gov/sheriff",
            nonEmergencyReporting: "https://www.traviscountytx.gov/sheriff/report-crime"
          }
        },
        {
          name: "Harris County",
          bounds: { 
            minLat: 29.3, maxLat: 30.3, 
            minLng: -95.9, maxLng: -94.9 
          },
          agency: {
            name: "Harris County Sheriff's Office",
            type: "County Sheriff",
            phone: "(713) 755-7427",
            emergencyPhone: "911",
            address: "1200 Baker St, Houston, TX 77002",
            website: "https://www.hcso.org/",
            nonEmergencyReporting: "https://www.hcso.org/Services/Online-Reporting"
          }
        },
        {
          name: "Dallas County",
          bounds: { 
            minLat: 32.4, maxLat: 33.2, 
            minLng: -97.1, maxLng: -96.4 
          },
          agency: {
            name: "Dallas County Sheriff's Department",
            type: "County Sheriff",
            phone: "(214) 749-8641",
            emergencyPhone: "911",
            address: "133 N Riverfront Blvd, Dallas, TX 75207",
            website: "https://www.dallascounty.org/departments/sheriff/",
            nonEmergencyReporting: "https://www.dallascounty.org/departments/sheriff/report-crime.php"
          }
        },
        {
          name: "Bexar County",
          bounds: { 
            minLat: 29.0, maxLat: 29.8, 
            minLng: -98.9, maxLng: -98.1 
          },
          agency: {
            name: "Bexar County Sheriff's Office",
            type: "County Sheriff",
            phone: "(210) 335-6000",
            emergencyPhone: "911",
            address: "200 N Comal St, San Antonio, TX 78207",
            website: "https://www.bexar.org/1250/Sheriffs-Office",
            nonEmergencyReporting: "https://www.bexar.org/1250/Sheriffs-Office"
          }
        },
        {
          name: "Tarrant County",
          bounds: { 
            minLat: 32.4, maxLat: 33.0, 
            minLng: -97.7, maxLng: -96.9 
          },
          agency: {
            name: "Tarrant County Sheriff's Office",
            type: "County Sheriff",
            phone: "(817) 884-1213",
            emergencyPhone: "911",
            address: "100 N Lamar St, Fort Worth, TX 76196",
            website: "https://www.tarrantcounty.com/en/sheriff.html",
            nonEmergencyReporting: "https://www.tarrantcounty.com/en/sheriff/divisions/patrol-division/online-reporting.html"
          }
        }
      ],
      defaultAgency: {
        name: "Texas Department of Public Safety",
        type: "State Police",
        phone: "(512) 424-2000",
        emergencyPhone: "911",
        address: "5805 N Lamar Blvd, Austin, TX 78752",
        website: "https://www.dps.texas.gov/",
        nonEmergencyReporting: "https://www.dps.texas.gov/section/crime-records/pages/crimeReporting.htm"
      }
    };

    setJurisdictionData(data);
  };

  const isInBounds = (lat, lng, bounds) => {
    return lat >= bounds.minLat && lat <= bounds.maxLat &&
           lng >= bounds.minLng && lng <= bounds.maxLng;
  };

  const findJurisdiction = (latitude, longitude) => {
    if (!jurisdictionData) return null;

    // First, check if location is within a city (city law enforcement has priority)
    for (const city of jurisdictionData.cities) {
      if (isInBounds(latitude, longitude, city.bounds)) {
        const countyBackup = findCountyJurisdiction(latitude, longitude);
        return {
          primary: city.agency,
          backup: countyBackup ? countyBackup.agency : null,
          location: {
            city: city.name,
            type: 'city'
          }
        };
      }
    }

    // If not in a city, check county jurisdiction
    const countyJurisdiction = findCountyJurisdiction(latitude, longitude);
    if (countyJurisdiction) {
      return {
        primary: countyJurisdiction.agency,
        backup: null,
        location: {
          county: countyJurisdiction.name,
          type: 'county'
        }
      };
    }

    // Default to state police
    return {
      primary: jurisdictionData.defaultAgency,
      backup: null,
      location: {
        state: 'Texas',
        type: 'state'
      }
    };
  };

  const findCountyJurisdiction = (latitude, longitude) => {
    if (!jurisdictionData) return null;

    for (const county of jurisdictionData.counties) {
      if (isInBounds(latitude, longitude, county.bounds)) {
        return county;
      }
    }
    return null;
  };

  const updateJurisdiction = (latitude, longitude) => {
    const jurisdiction = findJurisdiction(latitude, longitude);
    setCurrentJurisdiction(jurisdiction);
    return jurisdiction;
  };

  const clearJurisdiction = () => {
    setCurrentJurisdiction(null);
  };

  const value = {
    jurisdictionData,
    currentJurisdiction,
    findJurisdiction,
    updateJurisdiction,
    clearJurisdiction,
  };

  return (
    <JurisdictionContext.Provider value={value}>
      {children}
    </JurisdictionContext.Provider>
  );
};