import React, { useState, useEffect } from 'react';

interface CompetitorAnalysis {
  name: string;
  citationCount: number;
  aiScores: {
    gemini: number;
    perplexity: number;
    claude: number;
    chatgpt: number;
  };
  totalScore: number;
}

interface OverviewCompetitorTableProps {
  data: {
    company: string;
    industry: string;
    competitors: CompetitorAnalysis[];
  };
}

const OverviewCompetitorTable: React.FC<OverviewCompetitorTableProps> = ({ data }) => {
  const [competitors, setCompetitors] = useState(data.competitors || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (data.competitors) {
      setCompetitors(data.competitors);
    }
  }, [data.competitors]);

  const handleDeleteCompetitor = (index: number) => {
    const competitorName = competitors[index].name;
    if (window.confirm(`Are you sure you want to remove "${competitorName}" from the analysis?`)) {
      const updatedCompetitors = competitors.filter((_, i) => i !== index);
      setCompetitors(updatedCompetitors);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) return;
    
    setIsAddingCompetitor(true);
    try {
      // Simulate adding competitor
      const newCompetitor: CompetitorAnalysis = {
        name: newCompetitorName.trim(),
        citationCount: Math.floor(Math.random() * 500) + 100,
        aiScores: {
          gemini: (Math.random() * 10 + 2).toFixed(4),
          perplexity: (Math.random() * 0.2).toFixed(4),
          claude: (Math.random() * 0.2).toFixed(4),
          chatgpt: 5.0000
        },
        totalScore: Math.random() * 5 + 1
      };
      
      setCompetitors([...competitors, newCompetitor]);
      setNewCompetitorName('');
      setShowAddForm(false);
      setSuccessMessage(`Successfully added ${newCompetitorName.trim()} to the analysis!`);
      
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Error adding competitor:', error);
      alert('Failed to add competitor. Please try again.');
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 5) return 'text-green-600';
    if (score >= 3) return 'text-orange-500';
    return 'text-red-600';
  };

  const getAverageScore = (competitor: CompetitorAnalysis) => {
    const avg = (competitor.aiScores.gemini + competitor.aiScores.perplexity + 
                 competitor.aiScores.claude + competitor.aiScores.chatgpt) / 4;
    return avg.toFixed(4);
  };

  if (!competitors || competitors.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 8a2 2 0 011.414-1.414l4 4a2 2 0 010 2.828l-4 4a2 2 0 01-2.828 0l-4-4a2 2 0 010-2.828l4-4A2 2 0 018 8z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">No Competitors Found</h3>
            <p className="text-sm text-blue-700 mt-1">
              No competitors have been analyzed yet. Add competitors to get started with your analysis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competitor Performance Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Competitor Performance Overview</h3>
        <p className="text-sm text-gray-600 mb-4">Visual comparison of average AI visibility scores across competitors</p>
        
        <div className="space-y-3">
          {competitors.map((competitor, index) => {
            const averageScore = getAverageScore(competitor);
            const scoreValue = parseFloat(averageScore);
            
            // Determine bar color based on score ranges from the legend
            let barColor = 'bg-red-400'; // Poor (0-3.9)
            if (scoreValue >= 8) barColor = 'bg-green-500'; // Excellent (8-10)
            else if (scoreValue >= 6) barColor = 'bg-blue-500'; // Good (6-7.9)
            else if (scoreValue >= 4) barColor = 'bg-yellow-400'; // Fair (4-5.9)
            
            return (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-32 text-sm font-medium text-gray-900">
                  {competitor.name}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-700 w-16 text-right">
                      {averageScore}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6">
                      <div
                        className={`${barColor} h-6 rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(100, (scoreValue / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Chart Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Excellent (8-10)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Good (6-7.9)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="text-sm text-gray-600">Fair (4-5.9)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span className="text-sm text-gray-600">Poor (0-3.9)</span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Competitor Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add New Competitor</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showAddForm ? 'Cancel' : 'Add Competitor'}
          </button>
        </div>
        
        {showAddForm && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <label htmlFor="competitor-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Competitor Company Name
                </label>
                <input
                  type="text"
                  id="competitor-name"
                  value={newCompetitorName}
                  onChange={(e) => setNewCompetitorName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isAddingCompetitor && newCompetitorName.trim()) {
                      handleAddCompetitor();
                    }
                  }}
                  placeholder="Enter competitor company name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white"
                  disabled={isAddingCompetitor}
                />
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleAddCompetitor}
                  disabled={isAddingCompetitor || !newCompetitorName.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingCompetitor ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    'Add Competitor'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Competitor Analysis Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Competitor Analysis Results</h3>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown of AI visibility scores across different models</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COMPANY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GEMINI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PERPLEXITY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CLAUDE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CHATGPT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AVERAGE SCORE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((competitor, index) => {
                const averageScore = getAverageScore(competitor);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-600">
                            {competitor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{competitor.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getScoreColor(competitor.aiScores.gemini)}`}>
                        {competitor.aiScores.gemini.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getScoreColor(competitor.aiScores.perplexity)}`}>
                        {competitor.aiScores.perplexity.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getScoreColor(competitor.aiScores.claude)}`}>
                        {competitor.aiScores.claude.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getScoreColor(competitor.aiScores.chatgpt)}`}>
                        {competitor.aiScores.chatgpt.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getScoreColor(parseFloat(averageScore))}`}>
                        {averageScore}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteCompetitor(index)}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                        title="Remove competitor"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewCompetitorTable;
