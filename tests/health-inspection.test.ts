import { describe, it, expect, beforeEach } from "vitest"

class HealthInspectionContract {
  constructor() {
    this.inspectors = new Map()
    this.inspectorByPrincipal = new Map()
    this.inspections = new Map()
    this.violations = new Map()
    this.vendorComplianceHistory = new Map()
    this.correctiveActions = new Map()
    this.nextInspectionId = 1
    this.nextViolationId = 1
    this.nextInspectorId = 1
    this.contractAdmin = "ST1ADMIN"
  }
  
  registerInspector(name, certificationNumber, certificationExpiry, authority, specializations, caller) {
    if (caller !== this.contractAdmin) {
      return { error: "ERR-NOT-AUTHORIZED" }
    }
    
    if (!name || !certificationNumber || certificationExpiry <= Date.now()) {
      return { error: "ERR-INVALID-INPUT" }
    }
    
    const inspectorId = this.nextInspectorId++
    this.inspectors.set(inspectorId, {
      name,
      certificationNumber,
      certificationExpiry,
      authority,
      active: true,
      totalInspections: 0,
      specializations,
    })
    
    this.inspectorByPrincipal.set(caller, inspectorId)
    return { success: inspectorId }
  }
  
  scheduleInspection(vendorId, inspectionType, scheduledDate, inspector) {
    const inspectorData = this.inspectorByPrincipal.get(inspector)
    if (!inspectorData) {
      return { error: "ERR-INSPECTOR-NOT-CERTIFIED" }
    }
    
    const inspectorInfo = this.inspectors.get(inspectorData)
    if (!inspectorInfo || !inspectorInfo.active || inspectorInfo.certificationExpiry <= Date.now()) {
      return { error: "ERR-INSPECTOR-NOT-CERTIFIED" }
    }
    
    if (scheduledDate <= Date.now() || !inspectionType) {
      return { error: "ERR-INVALID-INPUT" }
    }
    
    const inspectionId = this.nextInspectionId++
    this.inspections.set(inspectionId, {
      vendorId,
      inspectorId: inspectorData,
      inspectionDate: scheduledDate,
      inspectionType,
      overallScore: 0,
      status: "scheduled",
      notes: "",
      followUpRequired: false,
      followUpDate: 0,
      certificateIssued: false,
      certificateExpiry: 0,
    })
    
    return { success: inspectionId }
  }
  
  completeInspection(inspectionId, overallScore, notes, followUpRequired, followUpDate, inspector) {
    const inspectorData = this.inspectorByPrincipal.get(inspector)
    if (!inspectorData) {
      return { error: "ERR-INSPECTOR-NOT-CERTIFIED" }
    }
    
    const inspection = this.inspections.get(inspectionId)
    if (!inspection) {
      return { error: "ERR-INSPECTION-NOT-FOUND" }
    }
    
    if (overallScore > 100) {
      return { error: "ERR-INVALID-SCORE" }
    }
    
    const currentTime = Date.now()
    const certificateIssued = overallScore >= 70
    const certificateExpiry = certificateIssued ? currentTime + 365 * 24 * 60 * 60 * 1000 : 0
    
    inspection.overallScore = overallScore
    inspection.status = "completed"
    inspection.notes = notes
    inspection.followUpRequired = followUpRequired
    inspection.followUpDate = followUpDate
    inspection.certificateIssued = certificateIssued
    inspection.certificateExpiry = certificateExpiry
    
    // Update vendor compliance history
    const vendorId = inspection.vendorId
    const compliance = this.vendorComplianceHistory.get(vendorId) || {
      lastInspectionDate: 0,
      lastInspectionScore: 0,
      totalInspections: 0,
      totalViolations: 0,
      criticalViolations: 0,
      complianceStatus: "unknown",
      certificateValidUntil: 0,
    }
    
    compliance.lastInspectionDate = currentTime
    compliance.lastInspectionScore = overallScore
    compliance.totalInspections += 1
    compliance.complianceStatus = overallScore >= 70 ? "compliant" : "non-compliant"
    compliance.certificateValidUntil = certificateExpiry
    
    this.vendorComplianceHistory.set(vendorId, compliance)
    
    // Update inspector statistics
    const inspectorInfo = this.inspectors.get(inspectorData)
    inspectorInfo.totalInspections += 1
    
    return { success: true }
  }
  
  recordViolation(inspectionId, violationType, severity, description, location, correctiveAction, deadline, inspector) {
    const inspectorData = this.inspectorByPrincipal.get(inspector)
    if (!inspectorData) {
      return { error: "ERR-INSPECTOR-NOT-CERTIFIED" }
    }
    
    const inspection = this.inspections.get(inspectionId)
    if (!inspection) {
      return { error: "ERR-INSPECTION-NOT-FOUND" }
    }
    
    if (!violationType || deadline <= Date.now()) {
      return { error: "ERR-INVALID-INPUT" }
    }
    
    const violationId = this.nextViolationId++
    this.violations.set(violationId, {
      inspectionId,
      violationType,
      severity,
      description,
      location,
      correctiveActionRequired: correctiveAction,
      deadline,
      status: "open",
      resolvedDate: 0,
      resolutionNotes: "",
    })
    
    // Update vendor compliance history
    const vendorId = inspection.vendorId
    const compliance = this.vendorComplianceHistory.get(vendorId)
    if (compliance) {
      compliance.totalViolations += 1
      if (severity === "critical") {
        compliance.criticalViolations += 1
      }
    }
    
    return { success: violationId }
  }
  
  isVendorCompliant(vendorId) {
    const compliance = this.vendorComplianceHistory.get(vendorId)
    if (!compliance) return false
    
    return compliance.complianceStatus === "compliant" && compliance.certificateValidUntil > Date.now()
  }
}

describe("Health Inspection Tracking Contract", () => {
  let contract
  
  beforeEach(() => {
    contract = new HealthInspectionContract()
  })
  
  describe("Inspector Management", () => {
    it("should allow admin to register inspectors", () => {
      const futureDate = Date.now() + 365 * 24 * 60 * 60 * 1000
      const result = contract.registerInspector(
          "John Inspector",
          "CERT123",
          futureDate,
          "Health Department",
          "Food Safety",
          "ST1ADMIN",
      )
      
      expect(result.success).toBe(1)
      
      const inspector = contract.inspectors.get(1)
      expect(inspector.name).toBe("John Inspector")
      expect(inspector.active).toBe(true)
    })
    
    it("should reject non-admin inspector registration", () => {
      const futureDate = Date.now() + 365 * 24 * 60 * 60 * 1000
      const result = contract.registerInspector(
          "John Inspector",
          "CERT123",
          futureDate,
          "Health Department",
          "Food Safety",
          "ST1NOTADMIN",
      )
      
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
    
    it("should reject invalid inspector data", () => {
      const pastDate = Date.now() - 1000
      const result = contract.registerInspector("", "CERT123", pastDate, "Health Department", "Food Safety", "ST1ADMIN")
      
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
  })
  
  describe("Inspection Scheduling", () => {
    beforeEach(() => {
      const futureDate = Date.now() + 365 * 24 * 60 * 60 * 1000
      contract.registerInspector(
          "John Inspector",
          "CERT123",
          futureDate,
          "Health Department",
          "Food Safety",
          "ST1ADMIN",
      )
    })
    
    it("should allow certified inspectors to schedule inspections", () => {
      const scheduledDate = Date.now() + 24 * 60 * 60 * 1000
      const result = contract.scheduleInspection(1, "routine", scheduledDate, "ST1ADMIN")
      
      expect(result.success).toBe(1)
      
      const inspection = contract.inspections.get(1)
      expect(inspection.vendorId).toBe(1)
      expect(inspection.status).toBe("scheduled")
    })
    
    it("should reject scheduling by non-certified inspectors", () => {
      const scheduledDate = Date.now() + 24 * 60 * 60 * 1000
      const result = contract.scheduleInspection(1, "routine", scheduledDate, "ST1NOTINSPECTOR")
      
      expect(result.error).toBe("ERR-INSPECTOR-NOT-CERTIFIED")
    })
  })
  
  describe("Inspection Completion", () => {
    beforeEach(() => {
      const futureDate = Date.now() + 365 * 24 * 60 * 60 * 1000
      contract.registerInspector(
          "John Inspector",
          "CERT123",
          futureDate,
          "Health Department",
          "Food Safety",
          "ST1ADMIN",
      )
      
      const scheduledDate = Date.now() + 24 * 60 * 60 * 1000
      contract.scheduleInspection(1, "routine", scheduledDate, "ST1ADMIN")
    })
    
    it("should complete inspection with passing score", () => {
      const result = contract.completeInspection(1, 85, "Good overall condition", false, 0, "ST1ADMIN")
      expect(result.success).toBe(true)
      
      const inspection = contract.inspections.get(1)
      expect(inspection.overallScore).toBe(85)
      expect(inspection.status).toBe("completed")
      expect(inspection.certificateIssued).toBe(true)
      
      expect(contract.isVendorCompliant(1)).toBe(true)
    })
    
    it("should complete inspection with failing score", () => {
      const result = contract.completeInspection(
          1,
          60,
          "Multiple violations found",
          true,
          Date.now() + 86400000,
          "ST1ADMIN",
      )
      expect(result.success).toBe(true)
      
      const inspection = contract.inspections.get(1)
      expect(inspection.overallScore).toBe(60)
      expect(inspection.certificateIssued).toBe(false)
      
      expect(contract.isVendorCompliant(1)).toBe(false)
    })
    
    it("should reject invalid scores", () => {
      const result = contract.completeInspection(1, 150, "Invalid score", false, 0, "ST1ADMIN")
      expect(result.error).toBe("ERR-INVALID-SCORE")
    })
  })
  
  describe("Violation Recording", () => {
    beforeEach(() => {
      const futureDate = Date.now() + 365 * 24 * 60 * 60 * 1000
      contract.registerInspector(
          "John Inspector",
          "CERT123",
          futureDate,
          "Health Department",
          "Food Safety",
          "ST1ADMIN",
      )
      
      const scheduledDate = Date.now() + 24 * 60 * 60 * 1000
      contract.scheduleInspection(1, "routine", scheduledDate, "ST1ADMIN")
    })
    
    it("should record violations during inspection", () => {
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000
      const result = contract.recordViolation(
          1,
          "Temperature Control",
          "critical",
          "Refrigerator temperature too high",
          "Kitchen area",
          "Repair refrigeration unit",
          deadline,
          "ST1ADMIN",
      )
      
      expect(result.success).toBe(1)
      
      const violation = contract.violations.get(1)
      expect(violation.violationType).toBe("Temperature Control")
      expect(violation.severity).toBe("critical")
      expect(violation.status).toBe("open")
    })
    
    it("should update vendor compliance with violations", () => {
      // First complete an inspection to create compliance history
      contract.completeInspection(1, 85, "Good condition", false, 0, "ST1ADMIN")
      
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000
      contract.recordViolation(
          1,
          "Temperature Control",
          "critical",
          "Description",
          "Kitchen",
          "Fix it",
          deadline,
          "ST1ADMIN",
      )
      
      const compliance = contract.vendorComplianceHistory.get(1)
      expect(compliance.totalViolations).toBe(1)
      expect(compliance.criticalViolations).toBe(1)
    })
  })
})
