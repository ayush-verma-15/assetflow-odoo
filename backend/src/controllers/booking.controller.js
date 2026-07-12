const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Check for overlapping bookings
const checkOverlap = async (resourceId, startTime, endTime, excludeBookingId = null) => {
  const where = {
    resourceId,
    status: {
      in: ['UPCOMING', 'ONGOING']
    }
  };

  if (excludeBookingId) {
    where.id = { not: excludeBookingId };
  }

  const existingBookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      bookedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  // Check overlap with any existing booking
  for (const booking of existingBookings) {
    const start1 = new Date(startTime);
    const end1 = new Date(endTime);
    const start2 = new Date(booking.startTime);
    const end2 = new Date(booking.endTime);

    // Overlap condition: start1 < end2 && start2 < end1
    if (start1 < end2 && start2 < end1) {
      return {
        hasOverlap: true,
        overlappingBooking: booking
      };
    }
  }

  return { hasOverlap: false };
};

// Create Booking
exports.createBooking = async (req, res) => {
  try {
    const { resourceId, startTime, endTime } = req.body;
    const bookedById = req.userId;

    // Check if resource exists and is bookable
    const resource = await prisma.asset.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (!resource.isBookable) {
      return res.status(400).json({ error: 'This asset is not bookable' });
    }

    // Validate time
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    if (start < new Date()) {
      return res.status(400).json({ error: 'Cannot book in the past' });
    }

    // Check for overlaps
    const overlapCheck = await checkOverlap(resourceId, start, end);
    if (overlapCheck.hasOverlap) {
      return res.status(409).json({
        error: 'Time slot overlaps with existing booking',
        overlappingBooking: overlapCheck.overlappingBooking
      });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        resourceId,
        bookedById,
        startTime: start,
        endTime: end,
        status: 'UPCOMING'
      },
      include: {
        resource: {
          include: {
            category: true
          }
        },
        bookedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Update resource status if needed
    await prisma.asset.update({
      where: { id: resourceId },
      data: { status: 'RESERVED' }
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get All Bookings with filters
exports.getBookings = async (req, res) => {
  try {
    const { 
      resourceId, 
      bookedById, 
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (resourceId) where.resourceId = resourceId;
    if (bookedById) where.bookedById = bookedById;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.OR = [
        {
          AND: [
            { startTime: { gte: startDate ? new Date(startDate) : undefined } },
            { startTime: { lte: endDate ? new Date(endDate) : undefined } }
          ]
        },
        {
          AND: [
            { endTime: { gte: startDate ? new Date(startDate) : undefined } },
            { endTime: { lte: endDate ? new Date(endDate) : undefined } }
          ]
        }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          resource: {
            include: {
              category: true,
              department: true
            }
          },
          bookedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { startTime: 'asc' }
      }),
      prisma.booking.count({ where })
    ]);

    res.json({
      bookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Single Booking
exports.getBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        resource: {
          include: {
            category: true,
            department: true
          }
        },
        bookedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update Booking (Reschedule)
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    const existingBooking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existingBooking.status === 'COMPLETED' || existingBooking.status === 'CANCELLED') {
      return res.status(400).json({ 
        error: `Cannot update ${existingBooking.status.toLowerCase()} booking` 
      });
    }

    // Check if user is the booker or admin
    if (existingBooking.bookedById !== req.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the booker or admin can update this booking' });
    }

    const start = new Date(startTime || existingBooking.startTime);
    const end = new Date(endTime || existingBooking.endTime);

    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Check for overlaps (excluding current booking)
    const overlapCheck = await checkOverlap(
      existingBooking.resourceId,
      start,
      end,
      id
    );

    if (overlapCheck.hasOverlap) {
      return res.status(409).json({
        error: 'Time slot overlaps with existing booking',
        overlappingBooking: overlapCheck.overlappingBooking
      });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        startTime: start,
        endTime: end
      },
      include: {
        resource: {
          include: {
            category: true
          }
        },
        bookedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Cancel Booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBooking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existingBooking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    if (existingBooking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Check if user is the booker or admin
    if (existingBooking.bookedById !== req.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the booker or admin can cancel this booking' });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        resource: true,
        bookedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Check if resource has any other active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        resourceId: existingBooking.resourceId,
        status: {
          in: ['UPCOMING', 'ONGOING']
        }
      }
    });

    if (activeBookings === 0) {
      await prisma.asset.update({
        where: { id: existingBooking.resourceId },
        data: { status: 'AVAILABLE' }
      });
    }

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Complete Booking (auto-mark as completed)
exports.completeBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return res.status(400).json({ error: `Booking already ${booking.status.toLowerCase()}` });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        resource: true,
        bookedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Check if resource has any other active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        resourceId: booking.resourceId,
        status: {
          in: ['UPCOMING', 'ONGOING']
        }
      }
    });

    if (activeBookings === 0) {
      await prisma.asset.update({
        where: { id: booking.resourceId },
        data: { status: 'AVAILABLE' }
      });
    }

    res.json({
      message: 'Booking completed successfully',
      booking: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Available Time Slots for a Resource
exports.getAvailableSlots = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { date } = req.query;

    const targetDate = new Date(date || new Date());
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all bookings for the day
    const bookings = await prisma.booking.findMany({
      where: {
        resourceId,
        status: {
          in: ['UPCOMING', 'ONGOING']
        },
        OR: [
          {
            AND: [
              { startTime: { gte: startOfDay } },
              { startTime: { lte: endOfDay } }
            ]
          },
          {
            AND: [
              { endTime: { gte: startOfDay } },
              { endTime: { lte: endOfDay } }
            ]
          }
        ]
      },
      orderBy: { startTime: 'asc' }
    });

    // Generate available slots (30-minute intervals)
    const slots = [];
    let currentTime = startOfDay;

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + 30 * 60000);
      
      let isAvailable = true;
      for (const booking of bookings) {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        
        if (currentTime < bookingEnd && slotEnd > bookingStart) {
          isAvailable = false;
          break;
        }
      }

      slots.push({
        start: currentTime.toISOString(),
        end: slotEnd.toISOString(),
        available: isAvailable
      });

      currentTime = slotEnd;
    }

    res.json({
      resourceId,
      date: targetDate.toISOString(),
      slots
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Upcoming Bookings for User
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.userId;

    const bookings = await prisma.booking.findMany({
      where: {
        bookedById: userId,
        status: {
          in: ['UPCOMING', 'ONGOING']
        }
      },
      include: {
        resource: {
          include: {
            category: true,
            department: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Auto-update booking statuses (cron job)
exports.updateBookingStatuses = async () => {
  try {
    const now = new Date();

    // Update UPCOMING to ONGOING
    await prisma.booking.updateMany({
      where: {
        status: 'UPCOMING',
        startTime: { lte: now },
        endTime: { gt: now }
      },
      data: { status: 'ONGOING' }
    });

    // Update ONGOING to COMPLETED
    await prisma.booking.updateMany({
      where: {
        status: 'ONGOING',
        endTime: { lte: now }
      },
      data: { status: 'COMPLETED' }
    });

    // Release resources for completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        resource: {
          status: 'RESERVED'
        }
      },
      distinct: ['resourceId']
    });

    for (const booking of completedBookings) {
      const activeBookings = await prisma.booking.count({
        where: {
          resourceId: booking.resourceId,
          status: {
            in: ['UPCOMING', 'ONGOING']
          }
        }
      });

      if (activeBookings === 0) {
        await prisma.asset.update({
          where: { id: booking.resourceId },
          data: { status: 'AVAILABLE' }
        });
      }
    }

    return { message: 'Booking statuses updated' };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
