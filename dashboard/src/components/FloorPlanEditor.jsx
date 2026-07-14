import React, { useState, useCallback } from 'react'
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { validateFloorPlan } from '../services/supabaseService'

let nodeIdCounter = 1

function newNode(label, position, type = 'room') {
  const id = `node_${nodeIdCounter++}`
  const typeColors = {
    entrance: '#38b26d',
    exit: '#e94560',
    elevator: '#2f80ed',
    stairs: '#f59e0b',
    room: '#16213e',
    reception: '#14b8a6',
    restroom: '#8b5cf6',
    pharmacy: '#ec4899',
  }
  const borderColor = typeColors[type] || '#e94560'
  return {
    id,
    data: { label, nodeType: type },
    position,
    style: {
      background: '#16213e',
      color: '#fff',
      border: `2px solid ${borderColor}`,
      borderRadius: 8,
      padding: '8px 12px',
    },
  }
}

function graphFromFlow(nodes, edges) {
  const nodeMap = {}
  nodes.forEach((n) => {
    nodeMap[n.id] = {
      label: n.data.label,
      x: n.position.x,
      y: n.position.y,
      type: n.data.nodeType || 'room',
    }
  })
  return {
    nodes: nodeMap,
    edges: edges.map((e) => ({ from: e.source, to: e.target, weight: 1 })),
  }
}

export default function FloorPlanEditor({ venueName, floors, onSubmit, saving }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    newNode('Main Entrance', { x: 100, y: 100 }, 'entrance'),
  ])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [newLabel, setNewLabel] = useState('')
  const [nodeType, setNodeType] = useState('room')
  const [version, setVersion] = useState(1)
  const [isPublished, setIsPublished] = useState(true)
  const [validation, setValidation] = useState(null)
  const [validating, setValidating] = useState(false)

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#e94560' } }, eds)),
    [setEdges]
  )

  const addNode = () => {
    if (!newLabel.trim()) return
    setNodes((nds) => [
      ...nds,
      newNode(newLabel.trim(), { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 }, nodeType),
    ])
    setNewLabel('')
  }

  const handleValidate = async () => {
    setValidating(true)
    setValidation(null)
    const graphJson = graphFromFlow(nodes, edges)
    const result = await validateFloorPlan(graphJson)
    setValidation(result)
    setValidating(false)
  }

  const handleSubmit = () => {
    const graphJson = graphFromFlow(nodes, edges)
    onSubmit(graphJson, { version, is_published: isPublished })
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="form-group"
          style={{ margin: 0, minWidth: 200 }}
          placeholder="Node label (e.g. Pharmacy)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNode()}
        />
        <select
          value={nodeType}
          onChange={(e) => setNodeType(e.target.value)}
          style={{
            padding: '10px 12px',
            background: '#0f1624',
            border: '1px solid #0f3460',
            borderRadius: 10,
            color: '#fff',
            fontSize: 14,
          }}
        >
          <option value="room">Room</option>
          <option value="entrance">Entrance</option>
          <option value="exit">Exit</option>
          <option value="elevator">Elevator</option>
          <option value="stairs">Stairs</option>
          <option value="reception">Reception</option>
          <option value="restroom">Restroom</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="junction">Junction</option>
          <option value="landmark">Landmark</option>
        </select>
        <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={addNode}>+ Add Node</button>
      </div>

      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>
        🖱 Drag to position • Connect by dragging between handles
      </p>

      {/* Validation results */}
      {validation && (
        <div className="card" style={{ marginBottom: 16, padding: 16, borderColor: validation.valid ? '#38b26d' : '#e94560' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ color: validation.valid ? '#38b26d' : '#e94560' }}>
              {validation.valid ? '✅ Valid floor plan' : '❌ Issues found'}
            </strong>
          </div>
          {validation.issues?.length > 0 && (
            <ul style={{ color: '#e94560', fontSize: 13, margin: 0, paddingLeft: 20 }}>
              {validation.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ height: 500, border: '1px solid #0f3460', borderRadius: 16, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap style={{ background: '#0d0d1b' }} />
          <Controls />
          <Background color="#1a1a2e" gap={16} />
        </ReactFlow>
      </div>

      {/* Version & publish controls */}
      <div className="card" style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ color: '#aaa', fontSize: 13 }}>Version:</label>
          <input
            type="number"
            min={1}
            value={version}
            onChange={(e) => setVersion(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: 60,
              padding: '6px 10px',
              background: '#0f1624',
              border: '1px solid #0f3460',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
            }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          Published (visible to mobile app)
        </label>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          className="btn-primary"
          style={{ background: '#2f80ed', borderColor: '#2f80ed' }}
          onClick={handleValidate}
          disabled={validating || nodes.length < 2}
        >
          {validating ? 'Validating...' : '🔍 Validate'}
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={saving || nodes.length < 2 || (validation && !validation.valid)}
        >
          {saving
            ? 'Saving...'
            : isPublished
              ? `✅ Publish v${version}`
              : `💾 Save as Draft v${version}`}
        </button>
      </div>
    </div>
  )
}
