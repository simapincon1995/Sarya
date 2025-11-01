import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { dashboardService } from '../services/dashboardService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './DashboardWidgetManagement.css';

const DashboardWidgetManagement = () => {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const toast = useRef(null);

  // Team form state
  const [teamForm, setTeamForm] = useState({
    teamId: null,
    name: '',
    performers: [{ name: '' }],
    expectedCalls: 0,
      actualCalls: 0,
    expectedCandidates: 0,
    actualCandidates: 0,
    expectedCallDuration: 0,
    actualCallDuration: 0,
    expectedJobApplications: 0,
    actualJobApplications: 0,
    fieldVisibility: {
      expectedCalls: false,
      actualCalls: false,
      expectedCandidates: false,
      actualCandidates: false,
      expectedCallDuration: false,
      actualCallDuration: false,
      expectedJobApplications: false,
      actualJobApplications: false
    },
    isVisible: true
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      const response = await dashboardService.getTeams();
      
      if (response.widget && response.widget.teams) {
        setTeams(response.widget.teams || []);
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load teams data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetTeamForm = () => {
    setTeamForm({
      teamId: null,
      name: '',
      performers: [{ name: '' }],
      expectedCalls: 0,
      actualCalls: 0,
      expectedCandidates: 0,
      actualCandidates: 0,
      expectedCallDuration: 0,
      actualCallDuration: 0,
      expectedJobApplications: 0,
      actualJobApplications: 0,
      fieldVisibility: {
        expectedCalls: false,
        actualCalls: false,
        expectedCandidates: false,
        actualCandidates: false,
        expectedCallDuration: false,
        actualCallDuration: false,
        expectedJobApplications: false,
        actualJobApplications: false
      },
      isVisible: true
    });
    setEditingTeam(null);
    setShowTeamForm(false);
  };

  const handleAddTeam = () => {
    if (teams.length >= 2) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Maximum Teams Reached',
        detail: 'You can only configure a maximum of 2 teams. Please delete an existing team to add a new one.'
      });
      return;
    }
    resetTeamForm();
    setShowTeamForm(true);
  };

  const handleEditTeam = (team) => {
    setTeamForm({
      teamId: team.teamId,
      name: team.name || '',
      performers: team.performers && team.performers.length > 0 
        ? team.performers.map(p => ({ name: p.name || '' }))
        : [{ name: '' }],
      expectedCalls: team.expectedCalls || 0,
      actualCalls: team.actualCalls || 0,
      expectedCandidates: team.expectedCandidates || 0,
      actualCandidates: team.actualCandidates || 0,
      expectedCallDuration: team.expectedCallDuration || 0,
      actualCallDuration: team.actualCallDuration || 0,
      expectedJobApplications: team.expectedJobApplications || 0,
      actualJobApplications: team.actualJobApplications || 0,
      fieldVisibility: team.fieldVisibility || {
        expectedCalls: false,
        actualCalls: false,
        expectedCandidates: false,
        actualCandidates: false,
        expectedCallDuration: false,
        actualCallDuration: false,
        expectedJobApplications: false,
        actualJobApplications: false
      },
      isVisible: team.isVisible !== undefined ? team.isVisible : true
    });
    setEditingTeam(team);
    setShowTeamForm(true);
  };

  const handleDeleteTeam = (team) => {
    confirmDialog({
      message: `Are you sure you want to delete "${team.name}"?`,
      header: 'Delete Team',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const updatedTeams = teams.filter(t => t.teamId !== team.teamId);
          await dashboardService.updateTeams({
            teams: updatedTeams,
            isVisible: true
          });
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
            detail: 'Team deleted successfully'
      });

          loadTeams();
    } catch (error) {
          console.error('Error deleting team:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
            detail: 'Failed to delete team'
          });
        }
      }
    });
  };

  const handleSaveTeam = async () => {
    try {
      // Validate team name
      if (!teamForm.name || !teamForm.name.trim()) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Please enter a team name'
        });
        return;
      }

      // Filter out empty performer names
      const validPerformers = teamForm.performers
        .filter(p => p.name && p.name.trim())
        .map(p => ({ name: p.name.trim() }));

      const teamData = {
        teamId: teamForm.teamId || `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: teamForm.name.trim(),
        performers: validPerformers.length > 0 ? validPerformers : [],
        expectedCalls: teamForm.expectedCalls || 0,
        actualCalls: teamForm.actualCalls || 0,
        expectedCandidates: teamForm.expectedCandidates || 0,
        actualCandidates: teamForm.actualCandidates || 0,
        expectedCallDuration: teamForm.expectedCallDuration || 0,
        actualCallDuration: teamForm.actualCallDuration || 0,
        expectedJobApplications: teamForm.expectedJobApplications || 0,
        actualJobApplications: teamForm.actualJobApplications || 0,
        fieldVisibility: teamForm.fieldVisibility || {
          expectedCalls: false,
          actualCalls: false,
          expectedCandidates: false,
          actualCandidates: false,
          expectedCallDuration: false,
          actualCallDuration: false,
          expectedJobApplications: false,
          actualJobApplications: false
        },
        isVisible: true
      };

      let updatedTeams;
      if (editingTeam) {
        // Update existing team
        updatedTeams = teams.map(t => 
          t.teamId === editingTeam.teamId ? teamData : t
        );
      } else {
        // Add new team - check limit
        if (teams.length >= 2) {
          toast.current?.show({
            severity: 'warn',
            summary: 'Maximum Teams Reached',
            detail: 'You can only configure a maximum of 2 teams. Please delete an existing team to add a new one.'
          });
          return;
        }
        updatedTeams = [...teams, teamData];
      }

      await dashboardService.updateTeams({
        teams: updatedTeams,
        isVisible: true
      });
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: editingTeam ? 'Team updated successfully' : 'Team added successfully'
      });

      resetTeamForm();
      loadTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save team'
      });
    }
  };

  // Performer management
  const addPerformer = () => {
    setTeamForm(prev => ({
      ...prev,
      performers: [...prev.performers, { name: '' }]
    }));
  };

  const removePerformer = (index) => {
    if (teamForm.performers.length > 1) {
      setTeamForm(prev => ({
        ...prev,
        performers: prev.performers.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePerformer = (index, name) => {
    setTeamForm(prev => ({
      ...prev,
      performers: prev.performers.map((p, i) => 
        i === index ? { ...p, name } : p
      )
    }));
  };


  // Update team form field
  const updateTeamField = (field, value) => {
    setTeamForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update field visibility
  const updateFieldVisibility = (field, checked) => {
    setTeamForm(prev => ({
      ...prev,
      fieldVisibility: {
        ...prev.fieldVisibility,
        [field]: checked
      }
    }));
  };

  // Get count of active metric cards
  const getActiveCardsCount = () => {
    const visibility = teamForm.fieldVisibility || {};
    let count = 0;
    
    // Check Call Metrics (at least one field checked)
    if (visibility.expectedCalls || visibility.actualCalls) count++;
    
    // Check Candidate Metrics (at least one field checked)
    if (visibility.expectedCandidates || visibility.actualCandidates) count++;
    
    // Check Call Duration Metrics (at least one field checked)
    if (visibility.expectedCallDuration || visibility.actualCallDuration) count++;
    
    // Check Job Applications Metrics (at least one field checked)
    if (visibility.expectedJobApplications || visibility.actualJobApplications) count++;
    
    return count;
  };

  // Check if a metric card can be toggled
  const canToggleCard = (cardName) => {
    const visibility = teamForm.fieldVisibility || {};
    const activeCount = getActiveCardsCount();
    
    // Define card field pairs
    const cardFields = {
      'calls': ['expectedCalls', 'actualCalls'],
      'candidates': ['expectedCandidates', 'actualCandidates'],
      'duration': ['expectedCallDuration', 'actualCallDuration'],
      'applications': ['expectedJobApplications', 'actualJobApplications']
    };
    
    const fields = cardFields[cardName] || [];
    const isCurrentlyActive = fields.some(field => visibility[field]);
    
    // If currently active, can always toggle off
    if (isCurrentlyActive) return true;
    
    // If not active, can toggle on only if we have less than 2 cards
    return activeCount < 2;
  };

  // Handle card toggle - enable/disable entire card
  const toggleMetricCard = (cardName, checked) => {
    const cardFields = {
      'calls': ['expectedCalls', 'actualCalls'],
      'candidates': ['expectedCandidates', 'actualCandidates'],
      'duration': ['expectedCallDuration', 'actualCallDuration'],
      'applications': ['expectedJobApplications', 'actualJobApplications']
    };
    
    const fields = cardFields[cardName] || [];
    const updatedVisibility = { ...teamForm.fieldVisibility };
    
    fields.forEach(field => {
      updatedVisibility[field] = checked;
    });
    
    setTeamForm(prev => ({
      ...prev,
      fieldVisibility: updatedVisibility
    }));
  };

  // Check if a metric card is active (at least one field checked)
  const isCardActive = (cardName) => {
    const visibility = teamForm.fieldVisibility || {};
    const cardFields = {
      'calls': ['expectedCalls', 'actualCalls'],
      'candidates': ['expectedCandidates', 'actualCandidates'],
      'duration': ['expectedCallDuration', 'actualCallDuration'],
      'applications': ['expectedJobApplications', 'actualJobApplications']
    };
    
    const fields = cardFields[cardName] || [];
    return fields.some(field => visibility[field]);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard-widget-management">
      <div className="page-header">
        <h1>Team Management</h1>
        <p>Configure teams with performance metrics</p>
      </div>

      {/* Teams List */}
      <Card title="Teams" className="teams-section">
        <div className="teams-header">
          <Button
            label="Add New Team"
            icon="pi pi-plus"
            onClick={handleAddTeam}
            className="add-team-btn"
            disabled={teams.length >= 2}
            tooltip={teams.length >= 2 ? 'Maximum of 2 teams allowed' : 'Add a new team'}
          />
          {teams.length >= 2 && (
            <span className="max-teams-message">Maximum of 2 teams configured</span>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="no-teams">
            <p>No teams configured. Click "Add New Team" to get started.</p>
              </div>
        ) : (
          <div className="teams-list">
            {teams.map((team, index) => (
              <Card key={team.teamId || index} className="team-card">
                <div className="team-card-header">
                  <h3>{team.name}</h3>
                  <div className="team-actions">
                <Button
                      icon="pi pi-pencil"
                      className="p-button-text p-button-sm"
                      onClick={() => handleEditTeam(team)}
                      tooltip="Edit Team"
                />
                <Button
                      icon="pi pi-trash"
                      className="p-button-text p-button-danger p-button-sm"
                      onClick={() => handleDeleteTeam(team)}
                      tooltip="Delete Team"
                />
              </div>
            </div>
                <div className="team-summary">
                  {team.fieldVisibility?.performers && team.performers && team.performers.length > 0 && (
                    <div className="team-summary-item">
                      <strong>Performers:</strong> {team.performers.map(p => p.name).join(', ')}
                    </div>
                  )}
                  {team.fieldVisibility?.expectedCalls && (
                    <div className="team-summary-item">
                      <strong>Calls:</strong> {team.actualCalls || 0} / {team.expectedCalls || 0}
                    </div>
                  )}
                  {team.fieldVisibility?.expectedCandidates && (
                    <div className="team-summary-item">
                      <strong>Candidates:</strong> {team.actualCandidates || 0} / {team.expectedCandidates || 0}
            </div>
          )}
        </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Team Form Modal */}
      {showTeamForm && (
        <div className="team-form-overlay">
          <Card className="team-form-card">
            <div className="form-header">
              <h3>{editingTeam ? 'Edit Team' : 'Add New Team'}</h3>
              <Button
                icon="pi pi-times"
                className="p-button-text p-button-sm"
                onClick={resetTeamForm}
              />
            </div>

            <div className="team-form">
              {/* Team Name */}
              <div className="form-group">
                <label htmlFor="teamName">Team Name *</label>
                <InputText
                  id="teamName"
                  value={teamForm.name}
                  onChange={(e) => updateTeamField('name', e.target.value)}
                  placeholder="Enter team name"
              />
            </div>

              {/* Performers of the Day */}
              <div className="form-section">
                <h4>Performers of the Day</h4>
                {teamForm.performers.map((performer, index) => (
                  <div key={index} className="performer-form-row">
                      <InputText
                        value={performer.name}
                        onChange={(e) => updatePerformer(index, e.target.value)}
                        placeholder={`Performer ${index + 1} name`}
                        className="performer-input"
                      />
                    {teamForm.performers.length > 1 && (
                        <Button
                          icon="pi pi-trash"
                          className="p-button-danger p-button-sm"
                          onClick={() => removePerformer(index)}
                          tooltip="Remove performer"
                        />
                      )}
                  </div>
                ))}
                <Button
                  label="Add Performer"
                  icon="pi pi-plus"
                  className="p-button-outlined p-button-sm add-performer-btn"
                  onClick={addPerformer}
                />
              </div>

              {/* Calls Section */}
              <div className="form-section">
                <h4>Call Metrics</h4>
                <div className="form-row">
              <div className="form-group">
                    <label htmlFor="expectedCalls">Expected Calls</label>
                    <InputNumber
                      id="expectedCalls"
                      value={teamForm.expectedCalls}
                      onValueChange={(e) => updateTeamField('expectedCalls', e.value || 0)}
                      min={0}
                      className="w-full"
                    />
                </div>
                  <div className="form-group">
                    <label htmlFor="actualCalls">Actual Calls</label>
                    <InputNumber
                      id="actualCalls"
                      value={teamForm.actualCalls}
                      onValueChange={(e) => updateTeamField('actualCalls', e.value || 0)}
                      min={0}
                      className="w-full"
                />
              </div>
            </div>
          </div>

              {/* Candidates Section */}
              <div className="form-section">
                <h4>Candidate Metrics</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expectedCandidates">Expected Candidates</label>
                    <InputNumber
                      id="expectedCandidates"
                      value={teamForm.expectedCandidates}
                      onValueChange={(e) => updateTeamField('expectedCandidates', e.value || 0)}
                      min={0}
                      className="w-full"
                    />
          </div>
                  <div className="form-group">
                    <label htmlFor="actualCandidates">Actual Candidates</label>
                    <InputNumber
                      id="actualCandidates"
                      value={teamForm.actualCandidates}
                      onValueChange={(e) => updateTeamField('actualCandidates', e.value || 0)}
                      min={0}
                      className="w-full"
                    />
                  </div>
          </div>
        </div>

              {/* Call Duration Section */}
              <div className="form-section">
                <h4>Call Duration (in minutes)</h4>
                <div className="form-row">
          <div className="form-group">
                    <label htmlFor="expectedCallDuration">Expected Duration</label>
                    <InputNumber
                      id="expectedCallDuration"
                      value={teamForm.expectedCallDuration}
                      onValueChange={(e) => updateTeamField('expectedCallDuration', e.value || 0)}
                      min={0}
                      className="w-full"
            />
          </div>
          <div className="form-group">
                    <label htmlFor="actualCallDuration">Actual Duration</label>
                    <InputNumber
                      id="actualCallDuration"
                      value={teamForm.actualCallDuration}
                      onValueChange={(e) => updateTeamField('actualCallDuration', e.value || 0)}
                      min={0}
                      className="w-full"
            />
          </div>
            </div>
          </div>

              {/* Job Applications Section */}
              <div className="form-section">
                <h4>Job Applications</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expectedJobApplications">Expected Applications</label>
                    <InputNumber
                      id="expectedJobApplications"
                      value={teamForm.expectedJobApplications}
                      onValueChange={(e) => updateTeamField('expectedJobApplications', e.value || 0)}
                      min={0}
                      className="w-full"
            />
          </div>
            <div className="form-group">
                    <label htmlFor="actualJobApplications">Actual Applications</label>
                    <InputNumber
                      id="actualJobApplications"
                      value={teamForm.actualJobApplications}
                      onValueChange={(e) => updateTeamField('actualJobApplications', e.value || 0)}
                      min={0}
                      className="w-full"
              />
            </div>
          </div>
          </div>

              {/* Field Visibility Configuration Section */}
              <div className="form-section">
                <h4>Field Visibility Configuration</h4>
                <p className="field-visibility-description">
                  Select which metric cards should be visible for this team on the dashboard. Each team can show a maximum of 2 cards at a time. Once selected, you can configure individual fields within each card.
                </p>
                <p className="field-visibility-warning">
                  Selected: {getActiveCardsCount()} / 2 cards
                </p>
                
                <div className="visibility-sections">
                  {/* Call Metrics Section */}
                  <div className={`visibility-section ${!isCardActive('calls') && !canToggleCard('calls') ? 'disabled' : ''}`}>
                    <div className="visibility-section-header">
                      <label className="custom-checkbox-label section-checkbox">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isCardActive('calls')}
                          onChange={(e) => toggleMetricCard('calls', e.target.checked)}
                          disabled={!canToggleCard('calls') && !isCardActive('calls')}
                        />
                        <span className="checkbox-text section-title-text">Call Metrics</span>
                      </label>
                    </div>
                    {isCardActive('calls') && (
                      <div className="visibility-section-fields">
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.expectedCalls || false}
                              onChange={(e) => updateFieldVisibility('expectedCalls', e.target.checked)}
                            />
                            <span className="checkbox-text">Expected Calls</span>
                          </label>
                        </div>
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.actualCalls || false}
                              onChange={(e) => updateFieldVisibility('actualCalls', e.target.checked)}
                            />
                            <span className="checkbox-text">Actual Calls</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Candidate Metrics Section */}
                  <div className={`visibility-section ${!isCardActive('candidates') && !canToggleCard('candidates') ? 'disabled' : ''}`}>
                    <div className="visibility-section-header">
                      <label className="custom-checkbox-label section-checkbox">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isCardActive('candidates')}
                          onChange={(e) => toggleMetricCard('candidates', e.target.checked)}
                          disabled={!canToggleCard('candidates') && !isCardActive('candidates')}
                        />
                        <span className="checkbox-text section-title-text">Candidate Metrics</span>
                      </label>
                    </div>
                    {isCardActive('candidates') && (
                      <div className="visibility-section-fields">
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.expectedCandidates || false}
                              onChange={(e) => updateFieldVisibility('expectedCandidates', e.target.checked)}
                            />
                            <span className="checkbox-text">Expected Candidates</span>
                          </label>
                        </div>
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.actualCandidates || false}
                              onChange={(e) => updateFieldVisibility('actualCandidates', e.target.checked)}
                            />
                            <span className="checkbox-text">Actual Candidates</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Call Duration Metrics Section */}
                  <div className={`visibility-section ${!isCardActive('duration') && !canToggleCard('duration') ? 'disabled' : ''}`}>
                    <div className="visibility-section-header">
                      <label className="custom-checkbox-label section-checkbox">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isCardActive('duration')}
                          onChange={(e) => toggleMetricCard('duration', e.target.checked)}
                          disabled={!canToggleCard('duration') && !isCardActive('duration')}
                        />
                        <span className="checkbox-text section-title-text">Call Duration Metrics</span>
                      </label>
                    </div>
                    {isCardActive('duration') && (
                      <div className="visibility-section-fields">
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.expectedCallDuration || false}
                              onChange={(e) => updateFieldVisibility('expectedCallDuration', e.target.checked)}
                            />
                            <span className="checkbox-text">Expected Call Duration</span>
                          </label>
                        </div>
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.actualCallDuration || false}
                              onChange={(e) => updateFieldVisibility('actualCallDuration', e.target.checked)}
                            />
                            <span className="checkbox-text">Actual Call Duration</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Job Applications Metrics Section */}
                  <div className={`visibility-section ${!isCardActive('applications') && !canToggleCard('applications') ? 'disabled' : ''}`}>
                    <div className="visibility-section-header">
                      <label className="custom-checkbox-label section-checkbox">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isCardActive('applications')}
                          onChange={(e) => toggleMetricCard('applications', e.target.checked)}
                          disabled={!canToggleCard('applications') && !isCardActive('applications')}
                        />
                        <span className="checkbox-text section-title-text">Job Applications Metrics</span>
                      </label>
                    </div>
                    {isCardActive('applications') && (
                      <div className="visibility-section-fields">
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.expectedJobApplications || false}
                              onChange={(e) => updateFieldVisibility('expectedJobApplications', e.target.checked)}
                            />
                            <span className="checkbox-text">Expected Job Applications</span>
                          </label>
                        </div>
                        <div className="visibility-item">
                          <label className="custom-checkbox-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={teamForm.fieldVisibility?.actualJobApplications || false}
                              onChange={(e) => updateFieldVisibility('actualJobApplications', e.target.checked)}
                            />
                            <span className="checkbox-text">Actual Job Applications</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
                  onClick={resetTeamForm}
            />
            <Button
                  label={editingTeam ? "Update Team" : "Save Team"}
              icon="pi pi-check"
                  onClick={handleSaveTeam}
            />
          </div>
        </div>
          </Card>
          </div>
        )}

      <Toast ref={toast} />
      <ConfirmDialog />
    </div>
  );
};

export default DashboardWidgetManagement;
