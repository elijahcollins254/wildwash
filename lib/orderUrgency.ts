/**
 * Order Urgency Ranking Algorithm
 * Calculates an urgency score for orders to prioritize what needs attention
 */

export interface UrgencyScore {
  score: number;
  factors: {
    ageScore: number; // Points based on how long the order has been in the system
    statusScore: number; // Priority based on current status
    assignmentScore: number; // Points if unassigned
    paymentScore: number; // Points if payment pending
  };
}

/**
 * Calculate urgency score for an order
 * Higher score = more urgent = should appear at top
 */
export function calculateOrderUrgency(order: any): UrgencyScore {
  const now = new Date();
  let score = 0;
  const factors = {
    ageScore: 0,
    statusScore: 0,
    assignmentScore: 0,
    paymentScore: 0,
  };

  // 1. AGE FACTOR: Orders that have been pending longer are more urgent
  if (order.created_at) {
    const createdAt = new Date(order.created_at);
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // 1 point per hour, increasing exponentially after 4 hours
    if (ageHours > 4) {
      factors.ageScore = 40 + (ageHours - 4) * 5; // Accelerates urgency after 4 hours
    } else {
      factors.ageScore = ageHours * 10;
    }
    score += factors.ageScore;
  }

  // 2. STATUS FACTOR: Different statuses have different urgency levels
  const status = String(order.status ?? order.state ?? 'requested').toLowerCase();
  
  const statusPriority: Record<string, number> = {
    // Critical - actively being worked on but stuck
    'in_progress': 80,
    'ready_for_pickup': 75,
    'out_for_delivery': 85, // Very urgent - already with rider
    'pending_confirmation': 70, // Waiting for customer
    'pending': 60, // New orders waiting for assignment
    'pending_payment': 65, // Waiting for payment
    'requested': 60,
    'assigned': 55,
    'washing': 40, // In progress but less urgent
    'folded': 45,
    'washed': 50,
    'completed': 0, // Completed orders have no urgency
    'delivered': 0,
    'cancelled': -100, // Cancelled orders shouldn't appear
  };
  
  factors.statusScore = statusPriority[status] || 50; // Default middle priority
  score += factors.statusScore;

  // 3. ASSIGNMENT FACTOR: Unassigned orders need attention
  const riderAssigned = order.rider || order.assigned_rider;
  if (!riderAssigned && status !== 'completed' && status !== 'delivered' && status !== 'cancelled') {
    factors.assignmentScore = 40; // Unassigned orders are very urgent
    score += factors.assignmentScore;
  }

  // 4. PAYMENT FACTOR: Unpaid orders are more urgent
  const paymentStatus = String(order.payment_status ?? 'unknown').toLowerCase();
  if (paymentStatus === 'pending' || paymentStatus === 'unpaid') {
    factors.paymentScore = 20;
    score += factors.paymentScore;
  }

  // 5. DELIVERY TIME FACTOR: Orders approaching delivery time are urgent
  if (order.delivery_date_time) {
    const deliveryTime = new Date(order.delivery_date_time);
    const timeUntilDelivery = (deliveryTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // If delivery is soon (within 4 hours), boost urgency
    if (timeUntilDelivery > 0 && timeUntilDelivery < 4) {
      score += 50 * (1 - timeUntilDelivery / 4); // Max 50 points if immediate
    }
    // If delivery time has passed, critical urgency
    else if (timeUntilDelivery <= 0) {
      score += 100; // Overdue orders are CRITICAL
    }
  }

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimals
    factors,
  };
}

/**
 * Sort orders by urgency (most urgent first)
 */
export function sortByUrgency(orders: any[]): any[] {
  return [...orders].sort((a, b) => {
    const scoreA = calculateOrderUrgency(a).score;
    const scoreB = calculateOrderUrgency(b).score;
    return scoreB - scoreA; // Descending (highest score first)
  });
}

/**
 * Get urgency level label and color for display
 */
export function getUrgencyLabel(score: number): { label: string; color: string; bgColor: string; rowBgColor: string } {
  if (score >= 150) {
    return { label: 'Critical', color: 'text-red-900 dark:text-red-100', bgColor: 'bg-red-200 dark:bg-red-900/70', rowBgColor: 'bg-red-50 dark:bg-red-950/30' };
  } else if (score >= 100) {
    return { label: 'High', color: 'text-orange-900 dark:text-orange-100', bgColor: 'bg-orange-200 dark:bg-orange-900/70', rowBgColor: 'bg-orange-50 dark:bg-orange-950/30' };
  } else if (score >= 60) {
    return { label: 'Medium', color: 'text-yellow-900 dark:text-yellow-100', bgColor: 'bg-yellow-200 dark:bg-yellow-900/70', rowBgColor: 'bg-yellow-50 dark:bg-yellow-950/30' };
  } else if (score >= 30) {
    return { label: 'Low', color: 'text-blue-900 dark:text-blue-100', bgColor: 'bg-blue-200 dark:bg-blue-900/70', rowBgColor: 'bg-blue-50 dark:bg-blue-950/30' };
  } else {
    return { label: 'Info', color: 'text-slate-900 dark:text-slate-100', bgColor: 'bg-slate-200 dark:bg-slate-700', rowBgColor: 'bg-slate-50 dark:bg-slate-800/60' };
  }
}
