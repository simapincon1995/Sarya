import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import { dashboardService } from '../services/dashboardService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './DashboardWidgetManagement.css';

const DashboardWidgetManagement = () => {
  const [performerOfDay, setPerformerOfDay] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTeamDataForm, setShowTeamDataForm] = useState(false);
  const [showPerformersForm, setShowPerformersForm] = useState(false);
  const toast = useRef(null);

  // Team data form
  const [teamDataForm, setTeamDataForm] = useState({
    teamAlpha: {
      name: 'Team Alpha',
      actualCalls: 0,
      expectedCalls: 0
    },
    teamBeta: {
      name: 'Team Beta', 
      actualCalls: 0,
      expectedCalls: 0
    },
    isVisible: true
  });

  // Performers form
  const [performersForm, setPerformersForm] = useState({
    performers: [{ name: '' }],
    isVisible: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const performerResponse = await dashboardService.getPerformerOfDay();
      
      console.log('Performer response:', performerResponse); // Debug log
      
      setPerformerOfDay(performerResponse.widget);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load dashboard data'
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleHidePerformer = async () => {
    try {
      await dashboardService.hidePerformerOfDay();
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Performer of the day hidden successfully'
      });

      loadData();
    } catch (error) {
      console.error('Error hiding performer:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to hide performer of the day'
      });
    }
  };

  // Team data management functions
  const handleTeamDataSubmit = async () => {
    try {
      await dashboardService.updateTeamData(teamDataForm);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Team data updated successfully'
      });

      setShowTeamDataForm(false);
      loadData();
    } catch (error) {
      console.error('Error updating team data:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update team data'
      });
    }
  };

  const updateTeamData = (team, field, value) => {
    setTeamDataForm(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [field]: value
      }
    }));
  };

  // Performers form management functions
  const addPerformer = () => {
    setPerformersForm(prev => ({
      ...prev,
      performers: [...prev.performers, { name: '' }]
    }));
  };

  const removePerformer = (index) => {
    if (performersForm.performers.length > 1) {
      setPerformersForm(prev => ({
        ...prev,
        performers: prev.performers.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePerformer = (index, name) => {
    setPerformersForm(prev => ({
      ...prev,
      performers: prev.performers.map((performer, i) => 
        i === index ? { ...performer, name } : performer
      )
    }));
  };

  const handlePerformersSubmit = async () => {
    try {
      // Filter out empty performer names
      const validPerformers = performersForm.performers.filter(performer => 
        performer.name && performer.name.trim()
      );

      if (validPerformers.length === 0) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Please enter at least one performer name'
        });
        return;
      }

      await dashboardService.updatePerformerOfDay({
        performers: validPerformers,
        isVisible: performersForm.isVisible
      });
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Performers of the day updated successfully'
      });

      setShowPerformersForm(false);
      loadData();
    } catch (error) {
      console.error('Error updating performers:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update performers of the day'
      });
    }
  };

  const openPerformersForm = () => {
    if (performerOfDay) {
      // Edit existing performers
      setPerformersForm({
        performers: performerOfDay.performerData.performers.map(p => ({ name: p.name })),
        isVisible: performerOfDay.isVisible
      });
    } else {
      // Add new performers
      setPerformersForm({
        performers: [{ name: '' }],
        isVisible: true
      });
    }
    setShowPerformersForm(true);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard-widget-management">
      <div className="page-header">
        <h1>Dashboard Management</h1>
        <p>Manage performers of the day and team performance data</p>
      </div>

      {/* Performer of the Day Section */}
      <Card title="Performers of the Day" className="performer-section">
        <div className="performer-content">
          {console.log('Rendering performerOfDay in management:', performerOfDay)}
          {performerOfDay ? (
            <div className="current-performer">
              <div className="performer-info">
                <h3>Today's Performers</h3>
                {/* <div className="performers-list">
                  {performerOfDay.performerData.performers.map((performer, index) => (
                    <div key={index} className="performer-item">
                      <span className="performer-name">{performer.name}</span>
                    </div>
                  ))}
                </div> */}
                <p className="updated-info">
                  Updated by: {performerOfDay.performerData.updatedBy} on {new Date(performerOfDay.performerData.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="performer-actions">
                <Button
                  label="Configure Performers of the Day"
                  icon="pi pi-cog"
                  onClick={openPerformersForm}
                />
                <Button
                  label="Hide"
                  icon="pi pi-eye-slash"
                  className="p-button-outlined p-button-danger"
                  onClick={handleHidePerformer}
                />
              </div>
            </div>
          ) : (
            <div className="no-performer">
              <p>No performers of the day set</p>
              <Button
                label="Configure Performers of the Day"
                icon="pi pi-cog"
                onClick={openPerformersForm}
              />
            </div>
          )}
        </div>

        {/* Performers Form Card */}
        {showPerformersForm && (
          <div className="performers-form-card">
            <div className="form-header">
              <h4>{performerOfDay ? 'Update Performers of the Day' : 'Set Performers of the Day'}</h4>
              <Button
                icon="pi pi-times"
                className="p-button-text p-button-sm"
                onClick={() => setShowPerformersForm(false)}
              />
            </div>
            <div className="performers-form">
              <div className="form-section">
                <h4>Performer Names</h4>
                {performersForm.performers.map((performer, index) => (
                  <div key={index} className="performer-form-row">
                    <div className="form-group performer-input-group">
                      <InputText
                        value={performer.name}
                        onChange={(e) => updatePerformer(index, e.target.value)}
                        placeholder={`Performer ${index + 1} name`}
                        className="performer-input"
                      />
                      {performersForm.performers.length > 1 && (
                        <Button
                          icon="pi pi-trash"
                          className="p-button-danger p-button-sm"
                          onClick={() => removePerformer(index)}
                          tooltip="Remove performer"
                        />
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  label="Add Performer"
                  icon="pi pi-plus"
                  className="p-button-outlined p-button-sm"
                  onClick={addPerformer}
                />
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <Checkbox
                    inputId="performersVisible"
                    checked={performersForm.isVisible}
                    onChange={(e) => setPerformersForm({ ...performersForm, isVisible: e.checked })}
                  />
                  <label htmlFor="performersVisible">Make visible on live dashboard</label>
                </div>
              </div>

              <div className="form-actions">
                <Button
                  label="Cancel"
                  icon="pi pi-times"
                  className="p-button-text"
                  onClick={() => setShowPerformersForm(false)}
                />
                <Button
                  label={performerOfDay ? "Update Performers" : "Set Performers"}
                  icon="pi pi-check"
                  onClick={handlePerformersSubmit}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Team Data Management Section */}
      <Card title="Team Data Management" className="team-data-section">
        <div className="team-data-content">
          <div className="team-data-info">
            <h3>Team Performance Data</h3>
            <p>Configure team Alpha and Beta data for donut charts showing actual vs expected calls per day</p>
          </div>
          <div className="team-data-actions">
          <Button
              label="Configure Team Data"
              icon="pi pi-cog"
              onClick={() => setShowTeamDataForm(true)}
            />
          </div>
        </div>

        {/* Team Data Form Card */}
        {showTeamDataForm && (
          <div className="team-data-form-card">
            <div className="form-header">
              <h4>Configure Team Data</h4>
                <Button
                icon="pi pi-times"
                  className="p-button-text p-button-sm"
                onClick={() => setShowTeamDataForm(false)}
                />
              </div>
            <div className="team-data-form">
              <div className="form-section">
                <h4>Team Alpha Configuration</h4>
                <div className="form-row">
          <div className="form-group">
                    <label htmlFor="teamAlphaName">Team Name</label>
            <InputText
                      id="teamAlphaName"
                      value={teamDataForm.teamAlpha.name}
                      onChange={(e) => updateTeamData('teamAlpha', 'name', e.target.value)}
                      placeholder="Team Alpha"
            />
          </div>
          <div className="form-group">
                    <label htmlFor="teamAlphaActual">Actual Calls Today</label>
            <InputText
                      id="teamAlphaActual"
                      type="number"
                      value={teamDataForm.teamAlpha.actualCalls}
                      onChange={(e) => updateTeamData('teamAlpha', 'actualCalls', parseInt(e.target.value) || 0)}
                      placeholder="0"
            />
          </div>
          <div className="form-group">
                    <label htmlFor="teamAlphaExpected">Expected Calls Today</label>
            <InputText
                      id="teamAlphaExpected"
                      type="number"
                      value={teamDataForm.teamAlpha.expectedCalls}
                      onChange={(e) => updateTeamData('teamAlpha', 'expectedCalls', parseInt(e.target.value) || 0)}
                      placeholder="0"
            />
          </div>
            </div>
          </div>

              <div className="form-section">
                <h4>Team Beta Configuration</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="teamBetaName">Team Name</label>
                    <InputText
                      id="teamBetaName"
                      value={teamDataForm.teamBeta.name}
                      onChange={(e) => updateTeamData('teamBeta', 'name', e.target.value)}
                      placeholder="Team Beta"
            />
          </div>
            <div className="form-group">
                    <label htmlFor="teamBetaActual">Actual Calls Today</label>
              <InputText
                      id="teamBetaActual"
                      type="number"
                      value={teamDataForm.teamBeta.actualCalls}
                      onChange={(e) => updateTeamData('teamBeta', 'actualCalls', parseInt(e.target.value) || 0)}
                      placeholder="0"
              />
            </div>
            <div className="form-group">
                    <label htmlFor="teamBetaExpected">Expected Calls Today</label>
                    <InputText
                      id="teamBetaExpected"
                      type="number"
                      value={teamDataForm.teamBeta.expectedCalls}
                      onChange={(e) => updateTeamData('teamBeta', 'expectedCalls', parseInt(e.target.value) || 0)}
                      placeholder="0"
              />
            </div>
          </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <Checkbox
                    inputId="teamDataVisible"
                    checked={teamDataForm.isVisible}
                    onChange={(e) => setTeamDataForm({ ...teamDataForm, isVisible: e.checked })}
                  />
                  <label htmlFor="teamDataVisible">Make visible on live dashboard</label>
            </div>
          </div>

              <div className="form-actions">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
                  onClick={() => setShowTeamDataForm(false)}
            />
            <Button
                  label="Save Team Data"
              icon="pi pi-check"
                  onClick={handleTeamDataSubmit}
            />
          </div>
        </div>
          </div>
        )}
      </Card>

      <Toast ref={toast} />
    </div>
  );
};

export default DashboardWidgetManagement;