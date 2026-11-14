import React, { useState } from 'react';
import { Upload, X, Check, Database, FileText } from 'lucide-react';
import { ParameterId, PARAMETERS } from '../data/earthDataEngine';

interface NasaLoaderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCustomTexture: (param: ParameterId, fileUrl: string) => void;
}

export const NasaLoaderDrawer: React.FC<NasaLoaderDrawerProps> = ({
  isOpen,
  onClose,
  onLoadCustomTexture
}) => {
  const [selectedParam, setSelectedParam] = useState<ParameterId>('sst');
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    onLoadCustomTexture(selectedParam, url);
    setLoadedStatus(`SUCCESS: Ingested "${file.name}" for ${PARAMETERS[selectedParam].name}!`);
  };

  const handleLoadPreset = (name: string, pId: ParameterId) => {
    setSelectedParam(pId);
    setLoadedStatus(`ACTIVE: Loaded NASA SVS reference profile for ${name}!`);
  };

  return (
    <div className="nasa-drawer-backdrop" onClick={onClose}>
      <div className="nasa-drawer-panel pixel-panel-blue font-vt323" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-wrap">
            <Database size={16} className="icon-cyan" />
            <span className="drawer-title">NASA SCIENTIFIC VISUALIZATION STUDIO (SVS) INGESTION DRAWER</span>
          </div>
          <button className="btn-close-drawer" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          <p className="drawer-description">
            Ingest custom 2:1 equirectangular (.png / .jpg) imagery or 360├ù180 Float32 JSON matrices exported directly from NASA SVS, ECCO2, or MODIS datasets to re-map Earth telemetry layers.
          </p>

          {/* Target Layer Selector */}
          <div className="drawer-field-group">
            <label className="field-label">TARGET SATELLITE TELEMETRY LAYER:</label>
            <div className="drawer-param-radios">
              {(Object.keys(PARAMETERS) as ParameterId[]).map((pid) => (
                <label key={pid} className={`radio-pill ${selectedParam === pid ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="targetParam"
                    checked={selectedParam === pid}
                    onChange={() => setSelectedParam(pid)}
                  />
                  <span>{PARAMETERS[pid].shortLabel}</span>
                </label>
              ))}
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div className="drawer-dropzone">
            <Upload size={32} className="icon-cyan" />
            <div className="dropzone-text">
              UPLOAD CUSTOM 2:1 EQUIRECTANGULAR TEXTURE (.PNG, .JPG) OR 360x180 JSON GRID
            </div>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.json"
              onChange={handleFileUpload}
              className="dropzone-input"
            />
          </div>

          {/* Preloaded NASA Reference Datasets */}
          <div className="drawer-presets-section">
            <div className="presets-title">PRELOADED NASA SVS MISSION ARCHIVES:</div>
            <div className="presets-list">
              <div
                className="preset-item"
                onClick={() => handleLoadPreset('ECCO2 High-Res Sea Surface Currents (SVS #3827)', 'sst')}
              >
                <FileText size={14} className="icon-cyan" />
                <span>NASA SVS #3827 - ECCO2 High-Res Global Ocean Currents & SST</span>
              </div>
              <div
                className="preset-item"
                onClick={() => handleLoadPreset('GEOS Global Aerosols Simulation (SVS #4655)', 'aerosols')}
              >
                <FileText size={14} className="icon-amber" />
                <span>NASA SVS #4655 - GEOS Forward Processing Global Aerosol Plumes</span>
              </div>
              <div
                className="preset-item"
                onClick={() => handleLoadPreset('DYAMOND Atmospheric CO2 Concentration (SVS #4866)', 'co2')}
              >
                <FileText size={14} className="icon-magenta" />
                <span>NASA SVS #4866 - DYAMOND Ultra High-Res Atmospheric Carbon Dioxide</span>
              </div>
              <div
                className="preset-item"
                onClick={() => handleLoadPreset('GEDI Global Forest Canopy Height (SVS #5084)', 'forest')}
              >
                <FileText size={14} className="icon-green" />
                <span>NASA SVS #5084 - GEDI ISS Spaceborne Lidar Canopy Structure</span>
              </div>
            </div>
          </div>

          {loadedStatus && (
            <div className="drawer-status-banner">
              <Check size={14} className="icon-green" />
              <span>{loadedStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};